import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceStatus } from '../../common/enums';
import { Team } from '../../teams/entities/team.entity';
import { HealthCheck } from '../../health-checks/entities/health-check.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { Alert } from '../../alerts/entities/alert.entity';

@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.UNKNOWN,
  })
  status!: ServiceStatus;

  @Column({ default: 'production' })
  environment!: string;

  @Column({ type: 'uuid', nullable: true })
  teamId!: string | null;

  @ManyToOne(() => Team, (team) => team.services, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Team | null;

  @OneToMany(() => HealthCheck, (healthCheck) => healthCheck.service)
  healthChecks!: HealthCheck[];

  @OneToMany(() => Incident, (incident) => incident.service)
  incidents!: Incident[];

  @OneToMany(() => Alert, (alert) => alert.service)
  alerts!: Alert[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
