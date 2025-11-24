import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const [
      drivers,
      zones,
      orders,
      routes,
      shifts,
      devices,
      alerts,
      documents,
      systemLogs,
      apiLogs,
      appErrors,
    ] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.zone.count(),
      this.prisma.order.count(),
      this.prisma.route.count(),
      this.prisma.shift.count(),
      this.prisma.device.count(),
      this.prisma.alert.count(),
      this.prisma.driverDocument.count(),
      this.prisma.systemLog.count(),
      this.prisma.apiLog.count(),
      this.prisma.appError.count(),
    ]);

    return {
      drivers,
      zones,
      orders,
      routes,
      shifts,
      devices,
      alerts,
      documents,
      logs: {
        systemLogs,
        apiLogs,
        appErrors,
      },
    };
  }
}

