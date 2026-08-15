import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CheckResultStatus, HealthCheckType, ServiceStatus } from '../common/enums';
import { ServicesService } from '../services/services.service';
import { HealthCheckResult } from './entities/health-check-result.entity';
import { HealthCheck } from './entities/health-check.entity';
import { HealthCheckRunner } from './health-check.runner';
import { HealthChecksService } from './health-checks.service';

describe('HealthChecksService', () => {
  let service: HealthChecksService;

  const checksRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const resultsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const servicesService = {
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };
  const runner = {
    run: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthChecksService,
        { provide: getRepositoryToken(HealthCheck), useValue: checksRepo },
        { provide: getRepositoryToken(HealthCheckResult), useValue: resultsRepo },
        { provide: ServicesService, useValue: servicesService },
        { provide: HealthCheckRunner, useValue: runner },
      ],
    }).compile();

    service = module.get(HealthChecksService);
  });

  it('creates a health check for an existing service', async () => {
    servicesService.findOne.mockResolvedValue({ id: 'svc-1' });
    checksRepo.create.mockImplementation((value) => value);
    checksRepo.save.mockImplementation(async (value) => ({ id: 'hc-1', ...value }));

    const created = await service.create('svc-1', {
      name: 'Homepage',
      target: 'https://example.com',
    });

    expect(created.type).toBe(HealthCheckType.HTTP);
    expect(created.serviceId).toBe('svc-1');
  });

  it('runs a check, stores result, and updates service status', async () => {
    checksRepo.findOne.mockResolvedValue({
      id: 'hc-1',
      serviceId: 'svc-1',
      type: HealthCheckType.HTTP,
      target: 'https://example.com',
      timeoutMs: 1000,
    });
    runner.run.mockResolvedValue({
      status: CheckResultStatus.UP,
      latencyMs: 42,
      message: 'HTTP 200 (expected 200)',
    });
    resultsRepo.create.mockImplementation((value) => value);
    resultsRepo.save.mockImplementation(async (value) => ({ id: 'res-1', ...value }));
    servicesService.updateStatus.mockResolvedValue({ id: 'svc-1' });

    const result = await service.run('hc-1');

    expect(result.status).toBe(CheckResultStatus.UP);
    expect(servicesService.updateStatus).toHaveBeenCalledWith(
      'svc-1',
      ServiceStatus.OPERATIONAL,
    );
  });

  it('throws when health check missing', async () => {
    checksRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
