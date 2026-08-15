import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertSeverity,
  AlertStatus,
  IncidentSeverity,
} from '../common/enums';
import { IncidentsService } from '../incidents/incidents.service';
import { ServicesService } from '../services/services.service';
import { assertAlertTransitionAllowed } from './alert-lifecycle';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CreateIncidentFromAlertDto } from './dto/create-incident-from-alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts.query.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from './entities/alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    private readonly servicesService: ServicesService,
    private readonly incidentsService: IncidentsService,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    if (dto.serviceId) {
      await this.servicesService.findOne(dto.serviceId);
    }

    if (dto.incidentId) {
      await this.incidentsService.findOne(dto.incidentId);
    }

    if (dto.createIncident && dto.incidentId) {
      throw new BadRequestException(
        'Provide either incidentId or createIncident, not both',
      );
    }

    if (dto.createIncident && !dto.serviceId) {
      throw new BadRequestException(
        'serviceId is required when createIncident is true',
      );
    }

    const alert = this.alertsRepository.create({
      title: dto.title,
      message: dto.message ?? null,
      severity: dto.severity ?? AlertSeverity.MEDIUM,
      status: AlertStatus.FIRING,
      source: dto.source ?? 'manual',
      serviceId: dto.serviceId ?? null,
      incidentId: dto.incidentId ?? null,
      metadata: dto.metadata ?? null,
      firedAt: new Date(),
    });

    const saved = await this.alertsRepository.save(alert);

    if (dto.createIncident && dto.serviceId) {
      return this.createIncidentFromAlert(saved.id, {
        title: dto.title,
        description: dto.message,
        severity: this.mapAlertSeverityToIncident(saved.severity),
      });
    }

    return this.findOne(saved.id);
  }

  async findAll(query: ListAlertsQueryDto): Promise<Alert[]> {
    return this.alertsRepository.find({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
        ...(query.incidentId ? { incidentId: query.incidentId } : {}),
      },
      order: { firedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.alertsRepository.findOne({
      where: { id },
      relations: { service: true, incident: true },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return alert;
  }

  async update(id: string, dto: UpdateAlertDto): Promise<Alert> {
    const alert = await this.findOne(id);

    if (dto.title !== undefined) alert.title = dto.title;
    if (dto.message !== undefined) alert.message = dto.message;
    if (dto.severity !== undefined) alert.severity = dto.severity;
    if (dto.source !== undefined) alert.source = dto.source;
    if (dto.metadata !== undefined) alert.metadata = dto.metadata;

    await this.alertsRepository.save(alert);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.alertsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
  }

  async acknowledge(id: string): Promise<Alert> {
    return this.transition(id, AlertStatus.ACKNOWLEDGED);
  }

  async resolve(id: string): Promise<Alert> {
    return this.transition(id, AlertStatus.RESOLVED);
  }

  async reopen(id: string): Promise<Alert> {
    return this.transition(id, AlertStatus.FIRING);
  }

  async linkIncident(id: string, incidentId: string): Promise<Alert> {
    const alert = await this.findOne(id);
    await this.incidentsService.findOne(incidentId);

    alert.incidentId = incidentId;
    await this.alertsRepository.save(alert);
    return this.findOne(id);
  }

  async unlinkIncident(id: string): Promise<Alert> {
    const alert = await this.findOne(id);
    alert.incidentId = null;
    await this.alertsRepository.save(alert);
    return this.findOne(id);
  }

  async createIncidentFromAlert(
    id: string,
    dto: CreateIncidentFromAlertDto = {},
  ): Promise<Alert> {
    const alert = await this.findOne(id);

    if (!alert.serviceId) {
      throw new BadRequestException(
        'Alert must be associated with a service to create an incident',
      );
    }

    if (alert.incidentId) {
      throw new BadRequestException(
        `Alert already linked to incident ${alert.incidentId}`,
      );
    }

    const incident = await this.incidentsService.create({
      title: dto.title ?? alert.title,
      description: dto.description ?? alert.message ?? undefined,
      serviceId: alert.serviceId,
      severity:
        dto.severity ?? this.mapAlertSeverityToIncident(alert.severity),
    });

    alert.incidentId = incident.id;
    await this.alertsRepository.save(alert);
    return this.findOne(id);
  }

  private async transition(id: string, to: AlertStatus): Promise<Alert> {
    const alert = await this.findOne(id);
    assertAlertTransitionAllowed(alert.status, to);

    alert.status = to;

    if (to === AlertStatus.RESOLVED) {
      alert.resolvedAt = new Date();
    }

    if (to === AlertStatus.FIRING) {
      alert.resolvedAt = null;
      alert.firedAt = new Date();
    }

    await this.alertsRepository.save(alert);
    return this.findOne(id);
  }

  private mapAlertSeverityToIncident(
    severity: AlertSeverity,
  ): IncidentSeverity {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return IncidentSeverity.CRITICAL;
      case AlertSeverity.HIGH:
        return IncidentSeverity.HIGH;
      case AlertSeverity.LOW:
      case AlertSeverity.INFO:
        return IncidentSeverity.LOW;
      case AlertSeverity.MEDIUM:
      default:
        return IncidentSeverity.MEDIUM;
    }
  }
}
