import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceStatus } from '../common/enums';
import { slugify } from '../common/utils/slugify';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    const slug = dto.slug ?? slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    const service = this.servicesRepository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      status: dto.status ?? ServiceStatus.UNKNOWN,
      environment: dto.environment ?? 'production',
      teamId: dto.teamId ?? null,
    });

    return this.servicesRepository.save(service);
  }

  findAll(): Promise<Service[]> {
    return this.servicesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({
      where: { id },
      relations: { healthChecks: true },
    });

    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }

    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);

    if (dto.slug && dto.slug !== service.slug) {
      await this.ensureSlugAvailable(dto.slug, id);
      service.slug = dto.slug;
    }

    if (dto.name !== undefined) service.name = dto.name;
    if (dto.description !== undefined) service.description = dto.description;
    if (dto.status !== undefined) service.status = dto.status;
    if (dto.environment !== undefined) service.environment = dto.environment;
    if (dto.teamId !== undefined) service.teamId = dto.teamId;

    return this.servicesRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const result = await this.servicesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Service ${id} not found`);
    }
  }

  async updateStatus(id: string, status: ServiceStatus): Promise<Service> {
    const service = await this.findOne(id);
    service.status = status;
    return this.servicesRepository.save(service);
  }

  private async ensureSlugAvailable(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.servicesRepository.findOne({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Service slug "${slug}" already exists`);
    }
  }
}
