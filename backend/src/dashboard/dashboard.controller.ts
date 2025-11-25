import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('orders-timeline')
  getOrdersTimeline(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.dashboardService.getOrdersTimeline(daysNum);
  }

  @Get('driver-performance')
  getDriverPerformance() {
    return this.dashboardService.getDriverPerformance();
  }

  @Get('active-shifts')
  getActiveShifts() {
    return this.dashboardService.getActiveShifts();
  }

  @Get('recent-alerts')
  getRecentAlerts() {
    return this.dashboardService.getRecentAlerts();
  }
}
