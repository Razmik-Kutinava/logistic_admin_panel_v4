import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { Driver, Prisma } from '@prisma/client';
import { DRIVER_STATUS, DriverStatusValue } from './driver-status.enum';

const driverInclude = {
  driverProfile: true,
  driverSettings: true,
  driverDocuments: {
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
  driverStatuses: {
    orderBy: {
      effectiveAt: 'desc' as const,
    },
    take: 1,
  },
};

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private async resolveExistingDriver(
    tx: Prisma.TransactionClient,
    dto: CreateDriverDto,
  ) {
    const [byPhone, byEmail, profileByLicense] = await Promise.all([
      tx.driver.findUnique({ where: { phone: dto.phone } }),
      tx.driver.findUnique({ where: { email: dto.email } }),
      dto.licenseNumber
        ? tx.driverProfile.findFirst({
            where: { licenseNumber: dto.licenseNumber },
          })
        : Promise.resolve(null),
    ]);

    const byLicense =
      profileByLicense &&
      (await tx.driver.findUnique({ where: { id: profileByLicense.driverId } }));

    const existingDriver = byPhone || byEmail || byLicense;

    return {
      existingDriver,
      canUpdatePhone:
        !!existingDriver && (!byPhone || byPhone.id === existingDriver.id),
      canUpdateEmail:
        !!existingDriver && (!byEmail || byEmail.id === existingDriver.id),
    };
  }

  private buildEmergencyContact(dto: CreateDriverDto) {
    if (!dto.emergencyContactName && !dto.emergencyContactPhone) {
      return undefined;
    }
    return {
      name: dto.emergencyContactName,
      phone: dto.emergencyContactPhone,
    };
  }

  private async findExistingDriver(dto: CreateDriverDto) {
    const contactMatch = await this.prisma.driver.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email }],
      },
    });

    if (contactMatch) {
      return contactMatch;
    }

    const profileMatch = await this.prisma.driverProfile.findFirst({
      where: { licenseNumber: dto.licenseNumber },
      select: { driverId: true },
    });

    if (profileMatch) {
      return this.prisma.driver.findUnique({
        where: { id: profileMatch.driverId },
      });
    }

    return null;
  }

  private async upsertDriverRelations(
    tx: Prisma.TransactionClient,
    driverId: string,
    dto: CreateDriverDto,
    status: DriverStatusValue,
  ) {
    await tx.driverProfile.upsert({
      where: { driverId },
      update: {
        licenseNumber: dto.licenseNumber,
        dateOfBirth: this.toDate(dto.dateOfBirth),
        address: dto.address,
        emergencyContact: this.buildEmergencyContact(dto),
      },
      create: {
        driverId,
        licenseNumber: dto.licenseNumber,
        dateOfBirth: this.toDate(dto.dateOfBirth),
        address: dto.address,
        emergencyContact: this.buildEmergencyContact(dto),
      },
    });

    await tx.driverSettings.upsert({
      where: { driverId },
      update: {
        notificationsEnabled: dto.notificationsEnabled ?? true,
        autoAcceptOrders: dto.autoAcceptOrders ?? false,
        preferredLanguage: dto.preferredLanguage ?? 'ru',
      },
      create: {
        driverId,
        notificationsEnabled: dto.notificationsEnabled ?? true,
        autoAcceptOrders: dto.autoAcceptOrders ?? false,
        preferredLanguage: dto.preferredLanguage ?? 'ru',
      },
    });

    await tx.driverStatusSnapshot.create({
      data: {
        driverId,
        status,
        reason: dto.statusReason,
        effectiveAt: new Date(),
      },
    });

    if (dto.documentType) {
      await tx.driverDocument.create({
        data: {
          driverId,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
          issuedAt: this.toDate(dto.documentIssuedAt),
          expiresAt: this.toDate(dto.documentExpiresAt),
          fileUrl: dto.documentFileUrl,
        },
      });
    }
  }

  private async loadDriver(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Driver> {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: driverInclude,
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    return driver;
  }


  async create(dto: CreateDriverDto): Promise<Driver> {
    const run = async () =>
      this.prisma.$transaction(async (tx) => {
        const { existingDriver, canUpdatePhone, canUpdateEmail } =
          await this.resolveExistingDriver(tx, dto);

        if (existingDriver) {
          const updateData: Prisma.DriverUncheckedUpdateInput = {
            name: dto.name,
            status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
          };

          if (canUpdatePhone) {
            updateData.phone = dto.phone;
          }

          if (canUpdateEmail) {
            updateData.email = dto.email;
          }

          const updatedDriver = await tx.driver.update({
            where: { id: existingDriver.id },
            data: updateData,
          });

          await this.upsertDriverRelations(
            tx,
            updatedDriver.id,
            dto,
            (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
          );

          return this.loadDriver(tx, updatedDriver.id);
        }

        const newDriver = await tx.driver.create({
          data: {
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            status: dto.status ?? DRIVER_STATUS.ACTIVE,
          },
        });

        await this.upsertDriverRelations(
          tx,
          newDriver.id,
          dto,
          (newDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
        );

        return this.loadDriver(tx, newDriver.id);
      });

    try {
      return await run();
    } catch (error: any) {
      if (error.code === 'P2002') {
        const fallback = await this.findExistingDriver(dto);
        if (fallback) {
          return fallback;
        }
      }
      throw error;
    }
  }

  async findAll(status?: DriverStatusValue): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: driverInclude,
    });
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: driverInclude,
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
        include: driverInclude,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const orConditions: Prisma.DriverWhereInput[] = [];

        if (updateDriverDto.phone) {
          orConditions.push({ phone: updateDriverDto.phone });
        }
        if (updateDriverDto.email) {
          orConditions.push({ email: updateDriverDto.email });
        }

        if (orConditions.length > 0) {
          const existing = await this.prisma.driver.findFirst({
            where: { OR: orConditions },
            include: driverInclude,
          });
          if (existing) {
            return existing;
          }
        }
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
      include: driverInclude,
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

