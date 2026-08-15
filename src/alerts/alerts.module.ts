import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentsModule } from '../incidents/incidents.module';
import { ServicesModule } from '../services/services.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    ServicesModule,
    IncidentsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [TypeOrmModule, AlertsService],
})
export class AlertsModule {}
