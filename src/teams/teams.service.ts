import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../common/utils/slugify';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/user.serializer';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateTeamDto): Promise<Team> {
    const slug = dto.slug ?? slugify(dto.name);
    await this.ensureSlugAvailable(slug);

    const team = this.teamsRepository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      members: [],
    });

    return this.teamsRepository.save(team);
  }

  async findAll(): Promise<Team[]> {
    const teams = await this.teamsRepository.find({
      relations: { members: true },
      order: { name: 'ASC' },
    });

    return teams.map((team) => {
      team.members = team.members.map(
        (member) => toPublicUser(member) as typeof member,
      );
      return team;
    });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: { members: true, services: true },
    });

    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    team.members = team.members.map((member) => {
      const publicMember = toPublicUser(member);
      return publicMember as typeof member;
    });

    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    if (dto.slug && dto.slug !== team.slug) {
      await this.ensureSlugAvailable(dto.slug, id);
      team.slug = dto.slug;
    }

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.description !== undefined) team.description = dto.description;

    await this.teamsRepository.save(team);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.teamsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Team ${id} not found`);
    }
  }

  async addMember(id: string, dto: AddTeamMemberDto): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: { members: true },
    });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    const user = await this.usersService.findEntityById(dto.userId);
    if (team.members.some((member) => member.id === user.id)) {
      throw new ConflictException('User is already a team member');
    }

    team.members.push(user);
    await this.teamsRepository.save(team);
    return this.findOne(id);
  }

  async removeMember(id: string, userId: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: { members: true },
    });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    const before = team.members.length;
    team.members = team.members.filter((member) => member.id !== userId);
    if (team.members.length === before) {
      throw new NotFoundException(`User ${userId} is not a member of this team`);
    }

    await this.teamsRepository.save(team);
    return this.findOne(id);
  }

  private async ensureSlugAvailable(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.teamsRepository.findOne({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Team slug "${slug}" already exists`);
    }
  }
}
