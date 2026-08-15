import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CheckResultStatus,
  HealthCheckType,
  ServiceStatus,
} from '../common/enums';
import { ServicesService } from '../services/services.service';
import { CreateHealthCheckDto } from './dto/create-health-check.dto';
import { UpdateHealthCheckDto } from './dto/update-health-check.dto';
import { HealthCheckResult } from './entities/health-check-result.entity';
import { HealthCheck } from './entities/health-check.entity';
import { HealthCheckRunner } from './health-check.runner';

@Injectable()
export class HealthChecksService {
  constructor(
    @InjectRepository(HealthCheck)
    private readonly healthChecksRepository: Repository<HealthCheck>,
    @InjectRepository(HealthCheckResult)
    private readonly resultsRepository: Repository<HealthCheckResult>,
    private readonly servicesService: ServicesService,
    private readonly runner: HealthCheckRunner,
  ) {}

  async create(
    serviceId: string,
    dto: CreateHealthCheckDto,
  ): Promise<HealthCheck> {
    await this.servicesService.findOne(serviceId);

    const check = this.healthChecksRepository.create({
      serviceId,
      name: dto.name,
      type: dto.type ?? HealthCheckType.HTTP,
      target: dto.target,
      intervalSeconds: dto.intervalSeconds ?? 60,
      timeoutMs: dto.timeoutMs ?? 5000,
      expectedStatusCode: dto.expectedStatusCode ?? null,
      isEnabled: dto.isEnabled ?? true,
    });

    return this.healthChecksRepository.save(check);
  }

  async findAllForService(serviceId: string): Promise<HealthCheck[]> {
    await this.servicesService.findOne(serviceId);
    return this.healthChecksRepository.find({
      where: { serviceId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<HealthCheck> {
    const check = await this.healthChecksRepository.findOne({
      where: { id },
    });
    if (!check) {
      throw new NotFoundException(`Health check ${id} not found`);
    }
    return check;
  }

  async update(id: string, dto: UpdateHealthCheckDto): Promise<HealthCheck> {
    const check = await this.findOne(id);

    if (dto.name !== undefined) check.name = dto.name;
    if (dto.type !== undefined) check.type = dto.type;
    if (dto.target !== undefined) check.target = dto.target;
    if (dto.intervalSeconds !== undefined) {
      check.intervalSeconds = dto.intervalSeconds;
    }
    if (dto.timeoutMs !== undefined) check.timeoutMs = dto.timeoutMs;
    if (dto.expectedStatusCode !== undefined) {
      check.expectedStatusCode = dto.expectedStatusCode;
    }
    if (dto.isEnabled !== undefined) check.isEnabled = dto.isEnabled;

    return this.healthChecksRepository.save(check);
  }

  async remove(id: string): Promise<void> {
    const result = await this.healthChecksRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Health check ${id} not found`);
    }
  }

  async listResults(
    healthCheckId: string,
    limit = 50,
  ): Promise<HealthCheckResult[]> {
    await this.findOne(healthCheckId);
    return this.resultsRepository.find({
      where: { healthCheckId },
      order: { checkedAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async run(id: string): Promise<HealthCheckResult> {
    const check = await this.findOne(id);
    const outcome = await this.runner.run(check);

    const result = this.resultsRepository.create({
      healthCheckId: check.id,
      status: outcome.status,
      latencyMs: outcome.latencyMs,
      message: outcome.message,
    });
    const saved = await this.resultsRepository.save(result);

    await this.servicesService.updateStatus(
      check.serviceId,
      this.mapResultToServiceStatus(outcome.status),
    );

    return saved;
  }

  private mapResultToServiceStatus(status: CheckResultStatus): ServiceStatus {
    switch (status) {
      case CheckResultStatus.UP:
        return ServiceStatus.OPERATIONAL;
      case CheckResultStatus.DEGRADED:
        return ServiceStatus.DEGRADED;
      case CheckResultStatus.DOWN:
        return ServiceStatus.MAJOR_OUTAGE;
      case CheckResultStatus.UNKNOWN:
      default:
        return ServiceStatus.UNKNOWN;
    }
  }
}
