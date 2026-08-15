import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard/overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('dashboard/services')
  getServicesStatus() {
    return this.dashboardService.getServicesStatus();
  }

  @Get('dashboard/services/:serviceId')
  getServiceStatus(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.dashboardService.getServiceStatus(serviceId);
  }

  @Public()
  @Get('status')
  getPublicStatus() {
    return this.dashboardService.getPublicStatus();
  }
}
