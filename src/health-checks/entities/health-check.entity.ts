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
import { HealthCheckType } from '../../common/enums';
import { Service } from '../../services/entities/service.entity';
import { HealthCheckResult } from './health-check-result.entity';

@Entity({ name: 'health_checks' })
export class HealthCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  serviceId!: string;

  @ManyToOne(() => Service, (service) => service.healthChecks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: Service;

  @Column()
  name!: string;

  @Column({
    type: 'enum',
    enum: HealthCheckType,
    default: HealthCheckType.HTTP,
  })
  type!: HealthCheckType;

  @Column()
  target!: string;

  @Column({ type: 'int', default: 60 })
  intervalSeconds!: number;

  @Column({ type: 'int', default: 5000 })
  timeoutMs!: number;

  @Column({ type: 'int', nullable: true })
  expectedStatusCode!: number | null;

  @Column({ default: true })
  isEnabled!: boolean;

  @OneToMany(() => HealthCheckResult, (result) => result.healthCheck)
  results!: HealthCheckResult[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
