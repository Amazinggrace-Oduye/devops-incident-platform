import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AlertSeverity, AlertStatus } from '../../common/enums';
import { Service } from '../../services/entities/service.entity';
import { Incident } from '../../incidents/entities/incident.entity';

@Entity({ name: 'alerts' })
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.MEDIUM,
  })
  severity!: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.FIRING,
  })
  status!: AlertStatus;

  @Column({ default: 'manual' })
  source!: string;

  @Column({ type: 'uuid', nullable: true })
  serviceId!: string | null;

  @ManyToOne(() => Service, (service) => service.alerts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'service_id' })
  service!: Service | null;

  @Column({ type: 'uuid', nullable: true })
  incidentId!: string | null;

  @ManyToOne(() => Incident, (incident) => incident.alerts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'incident_id' })
  incident!: Incident | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  firedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
