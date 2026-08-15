import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('creates a user and omits password hash in response', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({
      id: 'user-1',
      ...value,
    }));

    const created = await service.create({
      email: 'dev@example.com',
      name: 'Dev',
      password: 'password123',
    });

    expect(created).toMatchObject({
      id: 'user-1',
      email: 'dev@example.com',
      role: UserRole.ENGINEER,
    });
    expect(created).not.toHaveProperty('passwordHash');
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('makes the first registered user an ADMIN', async () => {
    repo.count.mockResolvedValue(0);
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({
      id: 'user-1',
      ...value,
    }));

    const created = await service.create({
      email: 'admin@example.com',
      name: 'Admin',
      password: 'password123',
    });

    expect(created.role).toBe(UserRole.ADMIN);
  });

  it('rejects duplicate emails', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing', email: 'dev@example.com' });
    await expect(
      service.create({
        email: 'dev@example.com',
        name: 'Dev',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when user missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
