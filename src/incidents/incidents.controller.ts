import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CreateIncidentUpdateDto } from './dto/create-incident-update.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsQueryDto } from './dto/list-incidents.query.dto';
import { MessageUpdateDto } from './dto/message-update.dto';
import { TransitionIncidentDto } from './dto/transition-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  create(@Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListIncidentsQueryDto) {
    return this.incidentsService.findAll(query);
  }

  @Get(':id/updates')
  listUpdates(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.listUpdates(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.remove(id);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MessageUpdateDto = {},
  ) {
    return this.incidentsService.acknowledge(
      id,
      body.message ?? 'Incident acknowledged',
      body.authorId,
    );
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MessageUpdateDto = {},
  ) {
    return this.incidentsService.resolve(
      id,
      body.message ?? 'Incident resolved',
      body.authorId,
    );
  }

  @Post(':id/transition')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionIncidentDto,
  ) {
    return this.incidentsService.transition(id, dto);
  }

  @Post(':id/updates')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  addUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentUpdateDto,
  ) {
    return this.incidentsService.addUpdate(id, dto);
  }
}
