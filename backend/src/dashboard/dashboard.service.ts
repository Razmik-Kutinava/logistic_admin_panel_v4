import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardMetrics {
  drivers: {
    total: number;
    active: number;
    onShift: number;
    inactive: number;
  };
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  shifts: {
    active: number;
    totalToday: number;
  };
  routes: {
    active: number;
    completed: number;
  };
  zones: {
    total: number;
    withDrivers: number;
  };
  alerts: {
    unresolved: number;
    total: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(): Promise<DashboardMetrics> {
    const [
      driversTotal,
      driversActive,
      driversInactive,
      activeShifts,
      shiftsToday,
      ordersTotal,
      ordersPending,
      ordersInProgress,
      ordersCompleted,
      ordersCancelled,
      routesActive,
      routesCompleted,
      zonesTotal,
      zonesWithDrivers,
      unresolvedAlerts,
      alertsTotal,
    ] = await Promise.all([
      // Drivers metrics
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: 'active' } }),
      this.prisma.driver.count({ where: { status: 'inactive' } }),

      // Shifts metrics
      this.prisma.shift.count({ where: { status: 'active' } }),
      this.prisma.shift.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Orders metrics
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { status: 'in_progress' } }),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.order.count({ where: { status: 'cancelled' } }),

      // Routes metrics
      this.prisma.route.count({ where: { status: 'active' } }),
      this.prisma.route.count({ where: { status: 'completed' } }),

      // Zones metrics
      this.prisma.zone.count(),
      this.prisma.zone.count({
        where: {
          assignments: {
            some: {},
          },
        },
      }),

      // Alerts metrics
      this.prisma.alert.count({ where: { status: { not: 'resolved' } } }),
      this.prisma.alert.count(),
    ]);

    const onShift = activeShifts;

    return {
      drivers: {
        total: driversTotal,
        active: driversActive,
        onShift,
        inactive: driversInactive,
      },
      orders: {
        total: ordersTotal,
        pending: ordersPending,
        inProgress: ordersInProgress,
        completed: ordersCompleted,
        cancelled: ordersCancelled,
      },
      shifts: {
        active: activeShifts,
        totalToday: shiftsToday,
      },
      routes: {
        active: routesActive,
        completed: routesCompleted,
      },
      zones: {
        total: zonesTotal,
        withDrivers: zonesWithDrivers,
      },
      alerts: {
        unresolved: unresolvedAlerts,
        total: alertsTotal,
      },
    };
  }

  async getOrdersTimeline(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    });

    return orders.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async getDriverPerformance() {
    const drivers = await this.prisma.driver.findMany({
      where: { status: 'active' },
      include: {
        shifts: {
          where: {
            status: 'completed',
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
        },
        ordersAssigned: {
          where: {
            status: 'completed',
          },
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      shiftsCompleted: driver.shifts.length,
      ordersCompleted: driver.ordersAssigned.length,
      totalDistance: driver.shifts.reduce(
        (sum, shift) => sum + (shift.distanceKm || 0),
        0,
      ),
    }));
  }

  async getActiveShifts() {
    return this.prisma.shift.findMany({
      where: { status: 'active' },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 20,
    });
  }

  async getRecentAlerts() {
    return this.prisma.alert.findMany({
      where: {
        status: { not: 'resolved' },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  }
}
