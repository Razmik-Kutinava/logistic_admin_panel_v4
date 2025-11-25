import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { AssignDriverToZoneDto } from './dto/assign-driver.dto';
import { Zone } from '@prisma/client';

const zoneInclude = {
  streets: true,
  assignments: {
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
        },
      },
    },
  },
  _count: {
    select: {
      orders: true,
      assignments: true,
    },
  },
};

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateZoneDto): Promise<Zone> {
    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.zone.create({
        data: {
          name: dto.name,
          color: dto.color || '#3b82f6',
          description: dto.description,
        },
      });

      if (dto.streets && dto.streets.length > 0) {
        await tx.zoneStreet.createMany({
          data: dto.streets.map((street) => ({
            zoneId: zone.id,
            street,
          })),
        });
      }

      return tx.zone.findUnique({
        where: { id: zone.id },
        include: zoneInclude,
      });
    });
  }

  async findAll(): Promise<Zone[]> {
    return this.prisma.zone.findMany({
      include: zoneInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: zoneInclude,
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  async update(id: string, dto: UpdateZoneDto): Promise<Zone> {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const zone = await tx.zone.update({
        where: { id },
        data: {
          name: dto.name,
          color: dto.color,
          description: dto.description,
        },
      });

      // Update streets if provided
      if (dto.streets !== undefined) {
        // Delete existing streets
        await tx.zoneStreet.deleteMany({
          where: { zoneId: id },
        });

        // Create new streets
        if (dto.streets.length > 0) {
          await tx.zoneStreet.createMany({
            data: dto.streets.map((street) => ({
              zoneId: id,
              street,
            })),
          });
        }
      }

      return tx.zone.findUnique({
        where: { id },
        include: zoneInclude,
      });
    });
  }

  async assignDriver(id: string, dto: AssignDriverToZoneDto): Promise<Zone> {
    await this.findOne(id);

    // Check if driver exists
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${dto.driverId} not found`);
    }

    // Check if assignment already exists
    const existing = await this.prisma.zoneDriver.findFirst({
      where: {
        zoneId: id,
        driverId: dto.driverId,
      },
    });

    if (!existing) {
      await this.prisma.zoneDriver.create({
        data: {
          zoneId: id,
          driverId: dto.driverId,
        },
      });
    }

    return this.findOne(id);
  }

  async unassignDriver(id: string, driverId: string): Promise<Zone> {
    await this.findOne(id);

    await this.prisma.zoneDriver.deleteMany({
      where: {
        zoneId: id,
        driverId,
      },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.zone.delete({ where: { id } });
  }
}
