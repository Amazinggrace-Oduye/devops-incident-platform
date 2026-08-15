import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/user.serializer';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const token = await this.signToken(user.id, user.email, user.role);
    return { accessToken: token, user };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !(await this.usersService.validatePassword(user, dto.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = toPublicUser(user);
    const token = await this.signToken(
      publicUser.id,
      publicUser.email,
      publicUser.role,
    );
    return { accessToken: token, user: publicUser };
  }

  private async signToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<string> {
    const expiresIn = (this.configService.get<string>('jwt.expiresIn') ??
      '1d') as StringValue;

    return this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn,
      },
    );
  }
}
