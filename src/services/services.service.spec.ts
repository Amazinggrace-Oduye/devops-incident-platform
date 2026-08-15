import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceStatus } from '../common/enums';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let service: ServicesService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: repo },
      ],
    }).compile();

    service = module.get(ServicesService);
  });

  it('creates a service with generated slug', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({ id: 'svc-1', ...value }));

    const created = await service.create({ name: 'Payments API' });

    expect(created.slug).toBe('payments-api');
    expect(created.status).toBe(ServiceStatus.UNKNOWN);
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects duplicate slug', async () => {
    repo.findOne.mockResolvedValue({ id: 'other', slug: 'payments-api' });
    await expect(
      service.create({ name: 'Payments API', slug: 'payments-api' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when service missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('00000000-0000-0000-0000-000000000001')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
