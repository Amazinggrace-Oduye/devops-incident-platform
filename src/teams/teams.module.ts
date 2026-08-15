import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Team } from './entities/team.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), UsersModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TypeOrmModule, TeamsService],
})
export class TeamsModule {}
