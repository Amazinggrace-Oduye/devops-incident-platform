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
import { IncidentSeverity, IncidentStatus } from '../../common/enums';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentUpdate } from './incident-update.entity';
import { Alert } from '../../alerts/entities/alert.entity';

@Entity({ name: 'incidents' })
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    default: IncidentSeverity.MEDIUM,
  })
  severity!: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status!: IncidentStatus;

  @Column({ type: 'uuid' })
  serviceId!: string;

  @ManyToOne(() => Service, (service) => service.incidents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: Service;

  @Column({ type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => User, (user) => user.assignedIncidents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @OneToMany(() => IncidentUpdate, (update) => update.incident)
  updates!: IncidentUpdate[];

  @OneToMany(() => Alert, (alert) => alert.incident)
  alerts!: Alert[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
