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
    return await this.prisma.$transaction(async (tx) => {
      // Проверяем все возможные конфликты внутри транзакции
      const [byPhone, byEmail, profileByLicense] = await Promise.all([
        tx.driver.findUnique({ where: { phone: dto.phone } }),
        tx.driver.findUnique({ where: { email: dto.email } }),
        dto.licenseNumber
          ? tx.driverProfile.findFirst({
              where: { licenseNumber: dto.licenseNumber },
            })
          : Promise.resolve(null),
      ]);

      // Получаем driver по licenseNumber если профиль найден
      const byLicense = profileByLicense
        ? await tx.driver.findUnique({ where: { id: profileByLicense.driverId } })
        : null;

      const existing = byPhone || byEmail || byLicense;

      if (existing) {
        const updateData: Prisma.DriverUncheckedUpdateInput = {
          name: dto.name,
          status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
        };

        // Phone можно обновить только если:
        // - Он не занят другим водителем (byPhone === null или byPhone.id === existing.id)
        // - И он отличается от текущего значения
        if (
          (!byPhone || byPhone.id === existing.id) &&
          existing.phone !== dto.phone
        ) {
          updateData.phone = dto.phone;
        }

        // Email можно обновить только если:
        // - Он не занят другим водителем (byEmail === null или byEmail.id === existing.id)
        // - И он отличается от текущего значения
        if (
          (!byEmail || byEmail.id === existing.id) &&
          existing.email !== dto.email
        ) {
          updateData.email = dto.email;
        }

        try {
          const updatedDriver = await tx.driver.update({
            where: { id: existing.id },
            data: updateData,
          });

          await this.upsertDriverRelations(
            tx,
            updatedDriver.id,
            dto,
            (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
          );

          return this.loadDriver(tx, updatedDriver.id);
        } catch (updateError: any) {
          // Если все же получили конфликт при обновлении - обновляем без phone/email
          if (updateError.code === 'P2002') {
            const safeUpdateData: Prisma.DriverUncheckedUpdateInput = {
              name: dto.name,
              status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              // НЕ обновляем phone и email, если они конфликтуют
            };

            const updatedDriver = await tx.driver.update({
              where: { id: existing.id },
              data: safeUpdateData,
            });

            await this.upsertDriverRelations(
              tx,
              updatedDriver.id,
              dto,
              (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
            );

            return this.loadDriver(tx, updatedDriver.id);
          }
          throw updateError;
        }
      }

      // Создаем нового водителя
      // Если между проверкой и созданием появился конфликт - обрабатываем его
      try {
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
      } catch (createError: any) {
        // Если получили конфликт при создании - повторно проверяем и обновляем
        if (createError.code === 'P2002') {
          const [retryByPhone, retryByEmail] = await Promise.all([
            tx.driver.findUnique({ where: { phone: dto.phone } }),
            tx.driver.findUnique({ where: { email: dto.email } }),
          ]);

          const retryExisting = retryByPhone || retryByEmail;
          if (!retryExisting) {
            throw new ConflictException('Водитель с такими данными уже существует');
          }

          const updateData: Prisma.DriverUncheckedUpdateInput = {
            name: dto.name,
            status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
          };

          if (
            (!retryByPhone || retryByPhone.id === retryExisting.id) &&
            retryExisting.phone !== dto.phone
          ) {
            updateData.phone = dto.phone;
          }

          if (
            (!retryByEmail || retryByEmail.id === retryExisting.id) &&
            retryExisting.email !== dto.email
          ) {
            updateData.email = dto.email;
          }

          const updatedDriver = await tx.driver.update({
            where: { id: retryExisting.id },
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
        throw createError;
      }
    });
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

