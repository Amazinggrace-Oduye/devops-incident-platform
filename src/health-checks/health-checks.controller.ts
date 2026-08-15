import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { CreateHealthCheckDto } from './dto/create-health-check.dto';
import { UpdateHealthCheckDto } from './dto/update-health-check.dto';
import { HealthChecksService } from './health-checks.service';

@Controller()
export class HealthChecksController {
  constructor(private readonly healthChecksService: HealthChecksService) {}

  @Post('services/:serviceId/health-checks')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  create(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateHealthCheckDto,
  ) {
    return this.healthChecksService.create(serviceId, dto);
  }

  @Get('services/:serviceId/health-checks')
  findAllForService(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.healthChecksService.findAllForService(serviceId);
  }

  @Get('health-checks/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthChecksService.findOne(id);
  }

  @Patch('health-checks/:id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHealthCheckDto,
  ) {
    return this.healthChecksService.update(id, dto);
  }

  @Delete('health-checks/:id')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthChecksService.remove(id);
  }

  @Post('health-checks/:id/run')
  @Roles(UserRole.ADMIN, UserRole.ENGINEER)
  run(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthChecksService.run(id);
  }

  @Get('health-checks/:id/results')
  listResults(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.healthChecksService.listResults(id, limit);
  }
}
