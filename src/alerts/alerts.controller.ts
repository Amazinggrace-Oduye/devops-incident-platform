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
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { CreateIncidentFromAlertDto } from './dto/create-incident-from-alert.dto';
import { LinkIncidentDto } from './dto/link-incident.dto';
import { ListAlertsQueryDto } from './dto/list-alerts.query.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListAlertsQueryDto) {
    return this.alertsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.remove(id);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  acknowledge(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.acknowledge(id);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  resolve(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.resolve(id);
  }

  @Post(':id/reopen')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.reopen(id);
  }

  @Post(':id/link-incident')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  linkIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkIncidentDto,
  ) {
    return this.alertsService.linkIncident(id, dto.incidentId);
  }

  @Delete(':id/link-incident')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  unlinkIncident(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.unlinkIncident(id);
  }

  @Post(':id/create-incident')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  createIncident(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateIncidentFromAlertDto = {},
  ) {
    return this.alertsService.createIncidentFromAlert(id, dto);
  }
}
