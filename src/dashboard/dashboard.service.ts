import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alert } from '../alerts/entities/alert.entity';
import {
  AlertSeverity,
  AlertStatus,
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
} from '../common/enums';
import { HealthCheckResult } from '../health-checks/entities/health-check-result.entity';
import { HealthCheck } from '../health-checks/entities/health-check.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Service } from '../services/entities/service.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import {
  CountMap,
  DashboardOverview,
  PublicStatusPage,
  ServiceStatusCard,
  ServiceStatusDetail,
} from './dashboard.types';

const OPEN_INCIDENT_STATUSES = Object.values(IncidentStatus).filter(
  (status) => status !== IncidentStatus.RESOLVED,
);

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    @InjectRepository(HealthCheck)
    private readonly healthChecksRepository: Repository<HealthCheck>,
    @InjectRepository(HealthCheckResult)
    private readonly resultsRepository: Repository<HealthCheckResult>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const [
      services,
      openIncidents,
      firingAlerts,
      teams,
      users,
      recentIncidents,
      recentAlerts,
    ] = await Promise.all([
      this.servicesRepository.find({ select: ['id', 'status'] }),
      this.incidentsRepository.find({
        where: { status: In(OPEN_INCIDENT_STATUSES) },
        select: ['id', 'severity'],
      }),
      this.alertsRepository.find({
        where: { status: AlertStatus.FIRING },
        select: ['id', 'severity'],
      }),
      this.teamsRepository.count(),
      this.usersRepository.count(),
      this.incidentsRepository.find({
        order: { startedAt: 'DESC' },
        take: 5,
        select: [
          'id',
          'title',
          'severity',
          'status',
          'serviceId',
          'startedAt',
        ],
      }),
      this.alertsRepository.find({
        order: { firedAt: 'DESC' },
        take: 5,
        select: [
          'id',
          'title',
          'severity',
          'status',
          'serviceId',
          'firedAt',
        ],
      }),
    ]);

    const servicesByStatus = this.emptyCountMap(Object.values(ServiceStatus));
    for (const service of services) {
      servicesByStatus[service.status] += 1;
    }

    const incidentsBySeverity = this.emptyCountMap(
      Object.values(IncidentSeverity),
    );
    for (const incident of openIncidents) {
      incidentsBySeverity[incident.severity] += 1;
    }

    const alertsBySeverity = this.emptyCountMap(Object.values(AlertSeverity));
    for (const alert of firingAlerts) {
      alertsBySeverity[alert.severity] += 1;
    }

    return {
      overallStatus: this.deriveOverallStatus(services.map((s) => s.status)),
      generatedAt: new Date().toISOString(),
      counts: {
        services: services.length,
        servicesByStatus,
        openIncidents: openIncidents.length,
        incidentsBySeverity,
        firingAlerts: firingAlerts.length,
        alertsBySeverity,
        teams,
        users,
      },
      recentIncidents,
      recentAlerts,
    };
  }

  async getServicesStatus(): Promise<ServiceStatusCard[]> {
    const services = await this.servicesRepository.find({
      order: { name: 'ASC' },
    });

    return Promise.all(services.map((service) => this.buildServiceCard(service)));
  }

  async getServiceStatus(serviceId: string): Promise<ServiceStatusDetail> {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    const card = await this.buildServiceCard(service);

    const [openIncidentList, firingAlertList, recentCheckResults] =
      await Promise.all([
        this.incidentsRepository.find({
          where: {
            serviceId,
            status: In(OPEN_INCIDENT_STATUSES),
          },
          order: { startedAt: 'DESC' },
          select: ['id', 'title', 'severity', 'status', 'startedAt'],
        }),
        this.alertsRepository.find({
          where: {
            serviceId,
            status: AlertStatus.FIRING,
          },
          order: { firedAt: 'DESC' },
          select: ['id', 'title', 'severity', 'firedAt'],
        }),
        this.resultsRepository
          .createQueryBuilder('result')
          .innerJoin('result.healthCheck', 'healthCheck')
          .where('healthCheck.serviceId = :serviceId', { serviceId })
          .orderBy('result.checkedAt', 'DESC')
          .take(10)
          .getMany(),
      ]);

    return {
      ...card,
      description: service.description,
      openIncidentList,
      firingAlertList,
      recentCheckResults: recentCheckResults.map((result) => ({
        id: result.id,
        healthCheckId: result.healthCheckId,
        status: result.status,
        latencyMs: result.latencyMs,
        message: result.message,
        checkedAt: result.checkedAt,
      })),
    };
  }

  async getPublicStatus(): Promise<PublicStatusPage> {
    const services = await this.servicesRepository.find({
      order: { name: 'ASC' },
      select: ['name', 'slug', 'status', 'environment'],
    });

    return {
      overallStatus: this.deriveOverallStatus(services.map((s) => s.status)),
      generatedAt: new Date().toISOString(),
      services: services.map((service) => ({
        name: service.name,
        slug: service.slug,
        status: service.status,
        environment: service.environment,
      })),
    };
  }

  private async buildServiceCard(service: Service): Promise<ServiceStatusCard> {
    const [openIncidents, firingAlerts, healthChecks, latestCheck] =
      await Promise.all([
        this.incidentsRepository.count({
          where: {
            serviceId: service.id,
            status: In(OPEN_INCIDENT_STATUSES),
          },
        }),
        this.alertsRepository.count({
          where: {
            serviceId: service.id,
            status: AlertStatus.FIRING,
          },
        }),
        this.healthChecksRepository.find({
          where: { serviceId: service.id },
          select: ['id', 'isEnabled'],
        }),
        this.resultsRepository
          .createQueryBuilder('result')
          .innerJoin('result.healthCheck', 'healthCheck')
          .where('healthCheck.serviceId = :serviceId', {
            serviceId: service.id,
          })
          .orderBy('result.checkedAt', 'DESC')
          .getOne(),
      ]);

    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      status: service.status,
      environment: service.environment,
      openIncidents,
      firingAlerts,
      healthChecks: {
        total: healthChecks.length,
        enabled: healthChecks.filter((check) => check.isEnabled).length,
      },
      latestCheck: latestCheck
        ? {
            status: latestCheck.status,
            latencyMs: latestCheck.latencyMs,
            checkedAt: latestCheck.checkedAt,
            healthCheckId: latestCheck.healthCheckId,
          }
        : null,
    };
  }

  private deriveOverallStatus(statuses: ServiceStatus[]): ServiceStatus {
    if (!statuses.length) return ServiceStatus.UNKNOWN;
    if (statuses.includes(ServiceStatus.MAJOR_OUTAGE)) {
      return ServiceStatus.MAJOR_OUTAGE;
    }
    if (statuses.includes(ServiceStatus.PARTIAL_OUTAGE)) {
      return ServiceStatus.PARTIAL_OUTAGE;
    }
    if (statuses.includes(ServiceStatus.DEGRADED)) {
      return ServiceStatus.DEGRADED;
    }
    if (statuses.includes(ServiceStatus.MAINTENANCE)) {
      return ServiceStatus.MAINTENANCE;
    }
    if (statuses.every((status) => status === ServiceStatus.OPERATIONAL)) {
      return ServiceStatus.OPERATIONAL;
    }
    return ServiceStatus.UNKNOWN;
  }

  private emptyCountMap<T extends string>(keys: T[]): CountMap<T> {
    return keys.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as CountMap<T>);
  }
}
