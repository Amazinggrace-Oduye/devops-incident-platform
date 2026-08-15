import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
    get: jest.fn().mockReturnValue('1d'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('registers and returns access token', async () => {
    usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'dev@example.com',
      name: 'Dev',
      role: UserRole.ENGINEER,
    });

    const result = await service.register({
      email: 'dev@example.com',
      name: 'Dev',
      password: 'password123',
    });

    expect(result.accessToken).toBe('token');
    expect(result.user.email).toBe('dev@example.com');
  });

  it('rejects invalid login', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@y.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
