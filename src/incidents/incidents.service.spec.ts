import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
} from '../common/enums';
import { ServicesService } from '../services/services.service';
import { User } from '../users/entities/user.entity';
import { IncidentUpdate } from './entities/incident-update.entity';
import { Incident } from './entities/incident.entity';
import { IncidentsService } from './incidents.service';

describe('IncidentsService', () => {
  let service: IncidentsService;

  const incidentsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  const updatesRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const usersRepo = {
    findOne: jest.fn(),
  };
  const servicesService = {
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getRepositoryToken(Incident), useValue: incidentsRepo },
        { provide: getRepositoryToken(IncidentUpdate), useValue: updatesRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: ServicesService, useValue: servicesService },
      ],
    }).compile();

    service = module.get(IncidentsService);
  });

  it('creates an incident, timeline entry, and updates service status', async () => {
    servicesService.findOne.mockResolvedValue({ id: 'svc-1' });
    incidentsRepo.create.mockImplementation((value) => value);
    incidentsRepo.save.mockImplementation(async (value) => ({
      id: 'inc-1',
      ...value,
    }));
    updatesRepo.create.mockImplementation((value) => value);
    updatesRepo.save.mockResolvedValue({});
    incidentsRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.HIGH,
      serviceId: 'svc-1',
      updates: [],
    });
    servicesService.updateStatus.mockResolvedValue({});

    const created = await service.create({
      title: 'API latency spike',
      serviceId: 'svc-1',
      severity: IncidentSeverity.HIGH,
    });

    expect(created.id).toBe('inc-1');
    expect(updatesRepo.save).toHaveBeenCalled();
    expect(servicesService.updateStatus).toHaveBeenCalledWith(
      'svc-1',
      ServiceStatus.PARTIAL_OUTAGE,
    );
  });

  it('acknowledges an open incident and sets acknowledgedAt', async () => {
    const incident = {
      id: 'inc-1',
      status: IncidentStatus.OPEN,
      severity: IncidentSeverity.MEDIUM,
      serviceId: 'svc-1',
      acknowledgedAt: null,
      updates: [],
    };
    incidentsRepo.findOne
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({
        ...incident,
        status: IncidentStatus.ACKNOWLEDGED,
        acknowledgedAt: expect.any(Date),
      });
    incidentsRepo.save.mockImplementation(async (value) => value);
    updatesRepo.create.mockImplementation((value) => value);
    updatesRepo.save.mockResolvedValue({});
    servicesService.updateStatus.mockResolvedValue({});

    const result = await service.acknowledge('inc-1');

    expect(incidentsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: IncidentStatus.ACKNOWLEDGED,
        acknowledgedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(IncidentStatus.ACKNOWLEDGED);
  });

  it('rejects illegal transitions', async () => {
    incidentsRepo.findOne.mockResolvedValue({
      id: 'inc-1',
      status: IncidentStatus.RESOLVED,
      severity: IncidentSeverity.LOW,
      serviceId: 'svc-1',
      updates: [],
    });

    await expect(
      service.transition('inc-1', {
        status: IncidentStatus.OPEN,
        message: 'reopen',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when incident is missing', async () => {
    incidentsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
