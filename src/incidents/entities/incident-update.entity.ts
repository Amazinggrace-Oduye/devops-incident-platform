import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentStatus } from '../../common/enums';
import { Incident } from './incident.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'incident_updates' })
export class IncidentUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  incidentId!: string;

  @ManyToOne(() => Incident, (incident) => incident.updates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident!: Incident;

  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @ManyToOne(() => User, (user) => user.incidentUpdates, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'author_id' })
  author!: User | null;

  @Column({ type: 'enum', enum: IncidentStatus, nullable: true })
  status!: IncidentStatus | null;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
