import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesModule } from '../services/services.module';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { IncidentUpdate } from './entities/incident-update.entity';
import { Incident } from './entities/incident.entity';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident, IncidentUpdate, User]),
    ServicesModule,
    UsersModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [TypeOrmModule, IncidentsService],
})
export class IncidentsModule {}
