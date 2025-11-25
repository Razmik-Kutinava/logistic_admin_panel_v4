import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto, RouteStatus } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { Route } from '@prisma/client';

const routeInclude = {
  points: {
    orderBy: {
      sequence: 'asc' as const,
    },
  },
  logs: {
    orderBy: {
      createdAt: 'desc' as const,
    },
    take: 10,
  },
  drivers: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  order: {
    select: {
      id: true,
      externalId: true,
      customerName: true,
      status: true,
    },
  },
};

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRouteDto): Promise<Route> {
    return this.prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          orderId: dto.orderId,
          driver_id: dto.driverId,
          status: dto.status,
        },
      });

      if (dto.points && dto.points.length > 0) {
        await tx.routePoint.createMany({
          data: dto.points.map((point) => ({
            routeId: route.id,
            address: point.address,
            sequence: point.sequence,
            status: point.status || 'pending',
          })),
        });
      }

      // Create log
      await tx.routeLog.create({
        data: {
          routeId: route.id,
          message: 'Route created',
        },
      });

      return tx.route.findUnique({
        where: { id: route.id },
        include: routeInclude,
      });
    });
  }

  async findAll(status?: RouteStatus): Promise<Route[]> {
    return this.prisma.route.findMany({
      where: status ? { status } : undefined,
      include: routeInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Route> {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: routeInclude,
    });

    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    return route;
  }

  async update(id: string, dto: UpdateRouteDto): Promise<Route> {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const route = await tx.route.update({
        where: { id },
        data: {
          orderId: dto.orderId,
          driver_id: dto.driverId,
          status: dto.status,
        },
      });

      // Log update
      if (dto.status) {
        await tx.routeLog.create({
          data: {
            routeId: id,
            message: `Status changed to ${dto.status}`,
          },
        });
      }

      return tx.route.findUnique({
        where: { id },
        include: routeInclude,
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.route.delete({ where: { id } });
  }
}
