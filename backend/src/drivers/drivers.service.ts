import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
  driverStatuses: true, // Это один объект (один к одному), не массив
};

type DriverWithRelations = Prisma.DriverGetPayload<{
  include: typeof driverInclude;
}>;

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

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
      include: driverInclude, // Добавляем include для полного объекта
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
        include: driverInclude, // Добавляем include для полного объекта
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
    try {
      // Upsert профиля водителя (только поля, которые есть в БД)
      // Сохраняем только если есть хотя бы одно поле
      if (dto.licenseNumber || dto.dateOfBirth || dto.address || dto.emergencyContactName || dto.emergencyContactPhone) {
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
      }

      // Upsert настроек водителя (только поля, которые есть в БД)
      // В БД есть: notificationsEnabled, language
      // НЕ сохраняем autoAcceptOrders - этого поля нет в БД
      try {
        await tx.driverSettings.upsert({
          where: { driverId },
          update: {
            notificationsEnabled: dto.notificationsEnabled ?? true,
            language: dto.preferredLanguage ?? 'ru',
          } as any, // Используем any для обхода проблем с типами Prisma
          create: {
            driverId,
            notificationsEnabled: dto.notificationsEnabled ?? true,
            language: dto.preferredLanguage ?? 'ru',
          } as any,
        });
      } catch (settingsError: any) {
        this.logger.warn(`Не удалось сохранить настройки водителя: ${settingsError.message}`);
        // Продолжаем выполнение, даже если настройки не сохранились
      }

      // Upsert снимка статуса (только поля, которые есть в БД)
      // В БД есть: availability, last_online
      // НЕ сохраняем statusReason - этого поля нет в БД
      try {
        // Сначала проверяем, существует ли запись (используем findFirst, так как driverId может не быть в whereUniqueInput)
        const existingStatus = await tx.driverStatusSnapshot.findFirst({
          where: { driverId },
        });

        if (existingStatus) {
          await tx.driverStatusSnapshot.update({
            where: { id: existingStatus.id },
            data: {
              availability: status,
              last_online: new Date(),
            } as any,
          });
        } else {
          await tx.driverStatusSnapshot.create({
            data: {
              driverId,
              availability: status,
              last_online: new Date(),
            } as any,
          });
        }
      } catch (statusError: any) {
        this.logger.warn(`Не удалось сохранить статус водителя: ${statusError.message}`);
        // Продолжаем выполнение, даже если статус не сохранился
      }

      // Создаем документ, если указан тип (только поля, которые есть в БД)
      // В БД есть: type, number, issuedAt, expiresAt, fileUrl
      if (dto.documentType) {
        try {
          await tx.driverDocument.create({
            data: {
              driverId,
              type: dto.documentType,
              number: dto.documentNumber,
              issuedAt: this.toDate(dto.documentIssuedAt),
              expiresAt: this.toDate(dto.documentExpiresAt),
              fileUrl: dto.documentFileUrl,
            } as any,
          });
        } catch (docError: any) {
          this.logger.warn(`Не удалось сохранить документ водителя: ${docError.message}`);
          // Продолжаем выполнение, даже если документ не сохранился
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Ошибка при создании связанных данных водителя (ID: ${driverId}): ${error.message}`,
        error.stack,
      );
      // НЕ выбрасываем ошибку, чтобы основная запись водителя сохранилась
      // Просто логируем ошибку
    }
  }

  private async loadDriver(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<DriverWithRelations> {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: driverInclude,
    });

    if (!driver) {
      throw new NotFoundException(`Водитель с ID ${id} не найден`);
    }

    return driver;
  }


  async create(dto: CreateDriverDto): Promise<DriverWithRelations> {
    this.logger.log(`Начало создания водителя: ${dto.name} (${dto.phone}, ${dto.email})`);
    
    const run = async () =>
      this.prisma.$transaction(async (tx) => {
        this.logger.debug('Поиск существующего водителя...');
        const { existingDriver, canUpdatePhone, canUpdateEmail } =
          await this.resolveExistingDriver(tx, dto);

        if (existingDriver) {
          this.logger.log(`Найден существующий водитель с ID: ${existingDriver.id}, обновление...`);
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

          this.logger.debug('Обновление связанных данных...');
          await this.upsertDriverRelations(
            tx,
            updatedDriver.id,
            dto,
            (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
          );

          return this.loadDriver(tx, updatedDriver.id);
        }

        this.logger.log('Создание нового водителя...');
        const newDriver = await tx.driver.create({
          data: {
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            status: dto.status ?? DRIVER_STATUS.ACTIVE,
          },
        });

        this.logger.debug(`Водитель создан с ID: ${newDriver.id}, создание связанных данных...`);
        await this.upsertDriverRelations(
          tx,
          newDriver.id,
          dto,
          (newDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
        );

        return this.loadDriver(tx, newDriver.id);
      }, {
        maxWait: 10000,
        timeout: 10000,
      });

    try {
      const result = await run();
      this.logger.log(`Водитель успешно создан/обновлен с ID: ${result.id}`);
      return result;
    } catch (error: any) {
      // Детальное логирование ошибки для диагностики
      this.logger.error(
        `Ошибка при создании водителя: ${error.message}`,
        error.stack,
      );
      this.logger.error(`Код ошибки: ${error.code || 'N/A'}`);
      this.logger.error(`Метаданные ошибки: ${JSON.stringify(error.meta || {}, null, 2)}`);
      this.logger.debug('DTO данные:', JSON.stringify(dto, null, 2));

      // Обработка ошибок валидации
      if (error.response && Array.isArray(error.response.message)) {
        this.logger.error('Ошибки валидации:', error.response.message);
        throw error;
      }

      if (error.code === 'P2002') {
        this.logger.warn(
          `Обнаружен конфликт уникальных полей (P2002), пытаемся найти существующего водителя`,
        );
        
        // Ищем существующего водителя с полным include
        const fallback = await this.prisma.driver.findFirst({
          where: {
            OR: [{ phone: dto.phone }, { email: dto.email }],
          },
          include: driverInclude,
        });

        if (fallback) {
          this.logger.log(`Найден существующий водитель с ID: ${fallback.id}`);
          return fallback;
        }

        // Если не нашли по phone/email, пробуем по лицензии
        if (dto.licenseNumber) {
          const profile = await this.prisma.driverProfile.findFirst({
            where: { licenseNumber: dto.licenseNumber },
          });
          if (profile) {
            const driver = await this.prisma.driver.findUnique({
              where: { id: profile.driverId },
              include: driverInclude,
            });
            if (driver) {
              this.logger.log(`Найден существующий водитель по лицензии с ID: ${driver.id}`);
              return driver;
            }
          }
        }
      }
      throw error;
    }
  }

  async findAll(status?: DriverStatusValue): Promise<DriverWithRelations[]> {
    return this.prisma.driver.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: driverInclude,
    });
  }

  async findOne(id: string): Promise<DriverWithRelations> {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: driverInclude,
    });

    if (!driver) {
      throw new NotFoundException(`Водитель с ID ${id} не найден`);
    }

    return driver;
  }


  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<DriverWithRelations> {
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
  ): Promise<DriverWithRelations> {
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

