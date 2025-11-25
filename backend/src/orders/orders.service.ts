import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderStatus } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';
import { Order } from '@prisma/client';

const orderInclude = {
  points: {
    orderBy: {
      sequence: 'asc' as const,
    },
  },
  assignments: {
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  },
  statusLogs: {
    orderBy: {
      timestamp: 'desc' as const,
    },
    take: 5,
  },
  zones: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          externalId: dto.externalId,
          customerName: dto.customerName,
          status: dto.status,
          zone_id: dto.zoneId,
        },
      });

      // Create order points if provided
      if (dto.points && dto.points.length > 0) {
        await tx.orderPoint.createMany({
          data: dto.points.map((point) => ({
            orderId: order.id,
            kind: point.kind,
            address: point.address,
            latitude: point.latitude,
            longitude: point.longitude,
            sequence: point.sequence,
            status: 'pending',
          })),
        });
      }

      // Create initial status log
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          status: dto.status,
          note: 'Order created',
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: orderInclude,
      });
    });
  }

  async findAll(status?: OrderStatus): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          externalId: dto.externalId,
          customerName: dto.customerName,
          status: dto.status,
          zone_id: dto.zoneId,
        },
      });

      // Log status change
      if (dto.status) {
        await tx.orderStatusLog.create({
          data: {
            orderId: id,
            status: dto.status,
            note: 'Status updated',
          },
        });
      }

      return tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
    });
  }

  async assignDriver(id: string, dto: AssignOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    // Check if driver exists
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${dto.driverId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create assignment
      await tx.orderAssignment.create({
        data: {
          orderId: id,
          driverId: dto.driverId,
          status: 'assigned',
        },
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.ASSIGNED,
        },
      });

      // Log status change
      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          status: OrderStatus.ASSIGNED,
          note: `Assigned to driver ${driver.name}`,
        },
      });

      return tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });
  }
}
