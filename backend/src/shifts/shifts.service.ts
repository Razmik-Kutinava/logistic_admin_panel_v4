import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto, ShiftStatus } from './dto/create-shift.dto';
import { EndShiftDto } from './dto/end-shift.dto';
import { Shift } from '@prisma/client';

const shiftInclude = {
  driver: {
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
    },
  },
  events: {
    orderBy: {
      timestamp: 'desc' as const,
    },
    take: 10,
  },
};

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftDto): Promise<Shift> {
    // Check if driver exists
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${dto.driverId} not found`);
    }

    // Check if driver already has an active shift
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        driverId: dto.driverId,
        status: ShiftStatus.ACTIVE,
      },
    });

    if (activeShift) {
      throw new BadRequestException(
        `Driver already has an active shift (ID: ${activeShift.id})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.create({
        data: {
          driverId: dto.driverId,
          startTime: new Date(),
          status: dto.status || ShiftStatus.ACTIVE,
        },
      });

      // Create shift event
      await tx.shiftEvent.create({
        data: {
          shiftId: shift.id,
          eventType: 'shift_started',
          payload: { driverId: dto.driverId },
        },
      });

      return tx.shift.findUnique({
        where: { id: shift.id },
        include: shiftInclude,
      });
    });
  }

  async findAll(status?: ShiftStatus): Promise<Shift[]> {
    return this.prisma.shift.findMany({
      where: status ? { status } : undefined,
      include: shiftInclude,
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: shiftInclude,
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    return shift;
  }

  async endShift(id: string, dto?: EndShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);

    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new BadRequestException(`Shift is not active`);
    }

    return this.prisma.$transaction(async (tx) => {
      const endedShift = await tx.shift.update({
        where: { id },
        data: {
          endTime: new Date(),
          status: ShiftStatus.COMPLETED,
          distanceKm: dto?.distanceKm,
          ordersCompleted: dto?.ordersCompleted,
        },
      });

      // Create shift event
      await tx.shiftEvent.create({
        data: {
          shiftId: id,
          eventType: 'shift_ended',
          payload: {
            distanceKm: dto?.distanceKm,
            ordersCompleted: dto?.ordersCompleted,
          },
        },
      });

      return tx.shift.findUnique({
        where: { id },
        include: shiftInclude,
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.shift.delete({ where: { id } });
  }
}
