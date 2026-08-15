import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesModule } from '../services/services.module';
import { HealthCheckResult } from './entities/health-check-result.entity';
import { HealthCheck } from './entities/health-check.entity';
import { HealthCheckRunner } from './health-check.runner';
import { HealthChecksController } from './health-checks.controller';
import { HealthChecksService } from './health-checks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthCheck, HealthCheckResult]),
    ServicesModule,
  ],
  controllers: [HealthChecksController],
  providers: [HealthChecksService, HealthCheckRunner],
  exports: [TypeOrmModule, HealthChecksService],
})
export class HealthChecksModule {}
