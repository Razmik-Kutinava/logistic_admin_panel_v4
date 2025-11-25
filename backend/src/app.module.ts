import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { DriversModule } from './drivers/drivers.module';
import { MetricsModule } from './metrics/metrics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';
import { ZonesModule } from './zones/zones.module';
import { ShiftsModule } from './shifts/shifts.module';
import { RoutesModule } from './routes/routes.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    DriversModule,
    MetricsModule,
    DashboardModule,
    OrdersModule,
    ZonesModule,
    ShiftsModule,
    RoutesModule,
    AlertsModule,
  ],
})
export class AppModule {}

