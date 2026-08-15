import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
} from '../common/enums';
import { ServicesService } from '../services/services.service';
import { User } from '../users/entities/user.entity';
import { CreateIncidentUpdateDto } from './dto/create-incident-update.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents.query.dto';
import { TransitionIncidentDto } from './dto/transition-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentUpdate } from './entities/incident-update.entity';
import { Incident } from './entities/incident.entity';
import { assertTransitionAllowed } from './incident-lifecycle';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,
    @InjectRepository(IncidentUpdate)
    private readonly updatesRepository: Repository<IncidentUpdate>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly servicesService: ServicesService,
  ) {}

  async create(dto: CreateIncidentDto): Promise<Incident> {
    await this.servicesService.findOne(dto.serviceId);
    await this.ensureAssigneeExists(dto.assigneeId);

    const incident = this.incidentsRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      serviceId: dto.serviceId,
      severity: dto.severity ?? IncidentSeverity.MEDIUM,
      status: IncidentStatus.OPEN,
      assigneeId: dto.assigneeId ?? null,
      startedAt: new Date(),
    });

    const saved = await this.incidentsRepository.save(incident);

    await this.updatesRepository.save(
      this.updatesRepository.create({
        incidentId: saved.id,
        authorId: dto.assigneeId ?? null,
        status: IncidentStatus.OPEN,
        message: 'Incident opened',
      }),
    );

    await this.servicesService.updateStatus(
      dto.serviceId,
      this.mapSeverityToServiceStatus(saved.severity),
    );

    return this.findOne(saved.id);
  }

  async findAll(query: ListIncidentsQueryDto): Promise<Incident[]> {
    return this.incidentsRepository.find({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      },
      order: { startedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findOne({
      where: { id },
      relations: { updates: true, service: true },
      order: { updates: { createdAt: 'ASC' } },
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found`);
    }

    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);
    await this.ensureAssigneeExists(dto.assigneeId ?? undefined);

    if (dto.title !== undefined) incident.title = dto.title;
    if (dto.description !== undefined) incident.description = dto.description;
    if (dto.severity !== undefined) incident.severity = dto.severity;
    if (dto.assigneeId !== undefined) incident.assigneeId = dto.assigneeId;

    await this.incidentsRepository.save(incident);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.incidentsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Incident ${id} not found`);
    }
  }

  async acknowledge(
    id: string,
    message = 'Incident acknowledged',
    authorId?: string,
  ): Promise<Incident> {
    return this.transition(id, {
      status: IncidentStatus.ACKNOWLEDGED,
      message,
      authorId,
    });
  }

  async resolve(
    id: string,
    message = 'Incident resolved',
    authorId?: string,
  ): Promise<Incident> {
    return this.transition(id, {
      status: IncidentStatus.RESOLVED,
      message,
      authorId,
    });
  }

  async transition(
    id: string,
    dto: TransitionIncidentDto,
  ): Promise<Incident> {
    const incident = await this.findOne(id);
    assertTransitionAllowed(incident.status, dto.status);
    await this.ensureAssigneeExists(dto.authorId);

    incident.status = dto.status;

    if (
      dto.status === IncidentStatus.ACKNOWLEDGED &&
      !incident.acknowledgedAt
    ) {
      incident.acknowledgedAt = new Date();
    }

    if (dto.status === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date();
    }

    await this.incidentsRepository.save(incident);

    await this.updatesRepository.save(
      this.updatesRepository.create({
        incidentId: incident.id,
        authorId: dto.authorId ?? null,
        status: dto.status,
        message: dto.message,
      }),
    );

    if (dto.status === IncidentStatus.RESOLVED) {
      await this.maybeRestoreServiceStatus(incident.serviceId);
    } else {
      await this.servicesService.updateStatus(
        incident.serviceId,
        this.mapSeverityToServiceStatus(incident.severity),
      );
    }

    return this.findOne(id);
  }

  async addUpdate(
    id: string,
    dto: CreateIncidentUpdateDto,
  ): Promise<IncidentUpdate> {
    if (dto.status) {
      await this.transition(id, {
        status: dto.status,
        message: dto.message,
        authorId: dto.authorId,
      });
      const updates = await this.listUpdates(id);
      return updates[updates.length - 1];
    }

    const incident = await this.findOne(id);
    await this.ensureAssigneeExists(dto.authorId);

    const update = this.updatesRepository.create({
      incidentId: incident.id,
      authorId: dto.authorId ?? null,
      status: null,
      message: dto.message,
    });

    return this.updatesRepository.save(update);
  }

  async listUpdates(id: string): Promise<IncidentUpdate[]> {
    await this.findOne(id);
    return this.updatesRepository.find({
      where: { incidentId: id },
      order: { createdAt: 'ASC' },
    });
  }

  private async ensureAssigneeExists(
    userId?: string | null,
  ): Promise<void> {
    if (!userId) return;

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  private mapSeverityToServiceStatus(
    severity: IncidentSeverity,
  ): ServiceStatus {
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        return ServiceStatus.MAJOR_OUTAGE;
      case IncidentSeverity.HIGH:
        return ServiceStatus.PARTIAL_OUTAGE;
      case IncidentSeverity.MEDIUM:
        return ServiceStatus.DEGRADED;
      case IncidentSeverity.LOW:
      default:
        return ServiceStatus.DEGRADED;
    }
  }

  private async maybeRestoreServiceStatus(serviceId: string): Promise<void> {
    const openCount = await this.incidentsRepository.count({
      where: {
        serviceId,
        status: Not(In([IncidentStatus.RESOLVED])),
      },
    });

    if (openCount === 0) {
      await this.servicesService.updateStatus(
        serviceId,
        ServiceStatus.OPERATIONAL,
      );
    }
  }
}
