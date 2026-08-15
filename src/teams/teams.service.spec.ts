import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const usersService = {
    findEntityById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: repo },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = module.get(TeamsService);
  });

  it('creates a team with generated slug', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({ id: 'team-1', ...value }));

    const created = await service.create({ name: 'Platform Eng' });
    expect(created.slug).toBe('platform-eng');
  });

  it('adds a member to a team', async () => {
    repo.findOne
      .mockResolvedValueOnce({
        id: 'team-1',
        members: [],
      })
      .mockResolvedValueOnce({
        id: 'team-1',
        members: [{ id: 'user-1', email: 'a@b.com', name: 'A', role: 'ENGINEER' }],
        services: [],
      });
    usersService.findEntityById.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      passwordHash: 'secret',
    });
    repo.save.mockImplementation(async (value) => value);

    const result = await service.addMember('team-1', { userId: 'user-1' });
    expect(result.members[0].id).toBe('user-1');
    expect(result.members[0]).not.toHaveProperty('passwordHash');
  });

  it('throws when team missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects duplicate slug', async () => {
    repo.findOne.mockResolvedValue({ id: 'other', slug: 'platform-eng' });
    await expect(
      service.create({ name: 'Platform Eng', slug: 'platform-eng' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
