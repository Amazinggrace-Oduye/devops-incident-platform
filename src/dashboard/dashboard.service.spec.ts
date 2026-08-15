import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const servicesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const incidentsRepo = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const alertsRepo = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const healthChecksRepo = {
    find: jest.fn(),
  };
  const resultsRepo = {
    createQueryBuilder: jest.fn(),
  };
  const teamsRepo = { count: jest.fn() };
  const usersRepo = { count: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Service), useValue: servicesRepo },
        { provide: getRepositoryToken(Incident), useValue: incidentsRepo },
        { provide: getRepositoryToken(Alert), useValue: alertsRepo },
        { provide: getRepositoryToken(HealthCheck), useValue: healthChecksRepo },
        {
          provide: getRepositoryToken(HealthCheckResult),
          useValue: resultsRepo,
        },
        { provide: getRepositoryToken(Team), useValue: teamsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('builds an overview with derived overall status', async () => {
    servicesRepo.find.mockResolvedValue([
      { id: 's1', status: ServiceStatus.OPERATIONAL },
      { id: 's2', status: ServiceStatus.DEGRADED },
    ]);
    incidentsRepo.find
      .mockResolvedValueOnce([
        { id: 'i1', severity: IncidentSeverity.HIGH },
      ])
      .mockResolvedValueOnce([
        {
          id: 'i1',
          title: 'Latency',
          severity: IncidentSeverity.HIGH,
          status: IncidentStatus.INVESTIGATING,
          serviceId: 's2',
          startedAt: new Date(),
        },
      ]);
    alertsRepo.find
      .mockResolvedValueOnce([
        { id: 'a1', severity: AlertSeverity.CRITICAL },
      ])
      .mockResolvedValueOnce([
        {
          id: 'a1',
          title: 'Spike',
          severity: AlertSeverity.CRITICAL,
          status: AlertStatus.FIRING,
          serviceId: 's2',
          firedAt: new Date(),
        },
      ]);
    teamsRepo.count.mockResolvedValue(2);
    usersRepo.count.mockResolvedValue(4);

    const overview = await service.getOverview();

    expect(overview.overallStatus).toBe(ServiceStatus.DEGRADED);
    expect(overview.counts.services).toBe(2);
    expect(overview.counts.openIncidents).toBe(1);
    expect(overview.counts.firingAlerts).toBe(1);
    expect(overview.counts.servicesByStatus.DEGRADED).toBe(1);
  });

  it('returns public status without internal ids', async () => {
    servicesRepo.find.mockResolvedValue([
      {
        name: 'API',
        slug: 'api',
        status: ServiceStatus.OPERATIONAL,
        environment: 'production',
      },
    ]);

    const status = await service.getPublicStatus();
    expect(status.overallStatus).toBe(ServiceStatus.OPERATIONAL);
    expect(status.services[0]).toEqual({
      name: 'API',
      slug: 'api',
      status: ServiceStatus.OPERATIONAL,
      environment: 'production',
    });
  });

  it('throws when service status detail is missing', async () => {
    servicesRepo.findOne.mockResolvedValue(null);
    await expect(
      service.getServiceStatus('00000000-0000-0000-0000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
