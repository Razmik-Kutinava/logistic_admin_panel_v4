import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { Driver, Prisma } from '@prisma/client';
import { DRIVER_STATUS, DriverStatusValue } from './driver-status.enum';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(createDriverDto: CreateDriverDto): Promise<Driver> {
    try {
      const { status, ...rest } = createDriverDto;
      const data = {
        ...rest,
        status: status ?? DRIVER_STATUS.ACTIVE,
      } as unknown as Prisma.DriverUncheckedCreateInput;

      return await this.prisma.driver.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Водитель с такими данными уже существует');
      }
      throw error;
    }
  }

  async findAll(status?: DriverStatusValue): Promise<Driver[]> {
    const where: Prisma.DriverWhereInput | undefined = status
      ? ({ status: status as unknown as string } as Prisma.DriverWhereInput)
      : undefined;

    return this.prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException(`Водитель с ID ${id} не найден`);
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    await this.findOne(id);

    try {
      const { status, ...rest } = updateDriverDto;
      const data = {
        ...rest,
        ...(status !== undefined ? { status } : {}),
      } as unknown as Prisma.DriverUncheckedUpdateInput;

      return await this.prisma.driver.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Водитель с такими данными уже существует');
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateDriverStatusDto,
  ): Promise<Driver> {
    await this.findOne(id);

    return this.prisma.driver.update({
      where: { id },
      data: {
        status: updateStatusDto.status as Prisma.DriverUncheckedUpdateInput['status'],
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.driver.update({
      where: { id },
      data: {
        status: DRIVER_STATUS.INACTIVE as Prisma.DriverUncheckedUpdateInput['status'],
      },
    });
  }
}

