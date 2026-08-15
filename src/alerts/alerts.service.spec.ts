import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AlertSeverity,
  AlertStatus,
  IncidentSeverity,
} from '../common/enums';
import { IncidentsService } from '../incidents/incidents.service';
import { ServicesService } from '../services/services.service';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';

describe('AlertsService', () => {
  let service: AlertsService;

  const alertsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const servicesService = {
    findOne: jest.fn(),
  };
  const incidentsService = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: alertsRepo },
        { provide: ServicesService, useValue: servicesService },
        { provide: IncidentsService, useValue: incidentsService },
      ],
    }).compile();

    service = module.get(AlertsService);
  });

  it('ingests a firing alert', async () => {
    servicesService.findOne.mockResolvedValue({ id: 'svc-1' });
    alertsRepo.create.mockImplementation((value) => value);
    alertsRepo.save.mockImplementation(async (value) => ({
      id: 'alert-1',
      ...value,
    }));
    alertsRepo.findOne.mockResolvedValue({
      id: 'alert-1',
      status: AlertStatus.FIRING,
      serviceId: 'svc-1',
    });

    const created = await service.create({
      title: 'High error rate',
      serviceId: 'svc-1',
      severity: AlertSeverity.HIGH,
      source: 'prometheus',
    });

    expect(created.status).toBe(AlertStatus.FIRING);
    expect(alertsRepo.save).toHaveBeenCalled();
  });

  it('creates an incident from an alert and links it', async () => {
    alertsRepo.findOne
      .mockResolvedValueOnce({
        id: 'alert-1',
        title: 'High error rate',
        message: '5xx spike',
        severity: AlertSeverity.HIGH,
        serviceId: 'svc-1',
        incidentId: null,
      })
      .mockResolvedValueOnce({
        id: 'alert-1',
        incidentId: 'inc-1',
        serviceId: 'svc-1',
      });
    incidentsService.create.mockResolvedValue({ id: 'inc-1' });
    alertsRepo.save.mockImplementation(async (value) => value);

    const result = await service.createIncidentFromAlert('alert-1', {});

    expect(incidentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: 'svc-1',
        severity: IncidentSeverity.HIGH,
      }),
    );
    expect(result.incidentId).toBe('inc-1');
  });

  it('rejects createIncident without serviceId', async () => {
    await expect(
      service.create({
        title: 'Orphan alert',
        createIncident: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when alert missing', async () => {
    alertsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('acknowledges a firing alert', async () => {
    alertsRepo.findOne
      .mockResolvedValueOnce({
        id: 'alert-1',
        status: AlertStatus.FIRING,
      })
      .mockResolvedValueOnce({
        id: 'alert-1',
        status: AlertStatus.ACKNOWLEDGED,
      });
    alertsRepo.save.mockImplementation(async (value) => value);

    const result = await service.acknowledge('alert-1');
    expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
  });
});
