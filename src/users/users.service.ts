import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { PublicUser, toPublicUser } from './user.serializer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    await this.ensureEmailAvailable(dto.email);

    const userCount = await this.usersRepository.count();
    const role =
      userCount === 0 ? UserRole.ADMIN : (dto.role ?? UserRole.ENGINEER);

    const user = this.usersRepository.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      role,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });

    const saved = await this.usersRepository.save(user);
    return toPublicUser(saved);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({
      order: { name: 'ASC' },
    });
    return users.map(toPublicUser);
  }

  async findOne(id: string): Promise<PublicUser> {
    return toPublicUser(await this.findEntityById(id));
  }

  async findEntityById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.findEntityById(id);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      await this.ensureEmailAvailable(dto.email);
      user.email = dto.email.toLowerCase();
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.usersRepository.save(user);
    return toPublicUser(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException(`Email "${email}" is already registered`);
    }
  }
}
