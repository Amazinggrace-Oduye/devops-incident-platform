import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CheckResultStatus } from '../../common/enums';
import { HealthCheck } from './health-check.entity';

@Entity({ name: 'health_check_results' })
export class HealthCheckResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  healthCheckId!: string;

  @ManyToOne(() => HealthCheck, (healthCheck) => healthCheck.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'health_check_id' })
  healthCheck!: HealthCheck;

  @Column({ type: 'enum', enum: CheckResultStatus })
  status!: CheckResultStatus;

  @Column({ type: 'int', nullable: true })
  latencyMs!: number | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  checkedAt!: Date;
}
