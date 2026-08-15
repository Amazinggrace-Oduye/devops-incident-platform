import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../alerts/entities/alert.entity';
import { HealthCheckResult } from '../health-checks/entities/health-check-result.entity';
import { HealthCheck } from '../health-checks/entities/health-check.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Service } from '../services/entities/service.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Service,
      Incident,
      Alert,
      HealthCheck,
      HealthCheckResult,
      Team,
      User,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
