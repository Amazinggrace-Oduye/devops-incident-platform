import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums';
import { Incident } from '../../incidents/entities/incident.entity';
import { IncidentUpdate } from '../../incidents/entities/incident-update.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ENGINEER })
  role!: UserRole;

  @Column({ type: 'varchar', nullable: true })
  passwordHash!: string | null;

  @OneToMany(() => Incident, (incident) => incident.assignee)
  assignedIncidents!: Incident[];

  @OneToMany(() => IncidentUpdate, (update) => update.author)
  incidentUpdates!: IncidentUpdate[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
