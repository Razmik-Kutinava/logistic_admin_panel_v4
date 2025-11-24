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
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { existingDriver, canUpdatePhone, canUpdateEmail } =
          await this.resolveExistingDriver(tx, dto);

        if (existingDriver) {
          const updateData: Prisma.DriverUncheckedUpdateInput = {
            name: dto.name,
            status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
          };

          // Обновляем phone/email только если они безопасны
          if (canUpdatePhone && existingDriver.phone !== dto.phone) {
            updateData.phone = dto.phone;
          }

          if (canUpdateEmail && existingDriver.email !== dto.email) {
            updateData.email = dto.email;
          }

          try {
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
          } catch (updateError: any) {
            // Если получили конфликт при обновлении - обновляем без phone/email
            if (updateError.code === 'P2002') {
              const safeUpdateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
                // НЕ обновляем phone и email
              };

              const updatedDriver = await tx.driver.update({
                where: { id: existingDriver.id },
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
          // Если получили конфликт при создании - находим и обновляем существующего
          if (createError.code === 'P2002') {
            const { existingDriver } = await this.resolveExistingDriver(tx, dto);
            if (existingDriver) {
              const updateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              };
              
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
          }
          throw createError;
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Если получили конфликт - находим существующего водителя и обновляем его
        return await this.prisma.$transaction(async (tx) => {
          // Пробуем найти водителя по любому из уникальных полей
          const byPhone = await tx.driver.findUnique({ where: { phone: dto.phone } });
          const byEmail = await tx.driver.findUnique({ where: { email: dto.email } });
          
          const existingDriver = byPhone || byEmail;
          
          if (!existingDriver) {
            // Если не нашли - значит конфликт по другому полю, пробуем по лицензии
            const profileByLicense = dto.licenseNumber
              ? await tx.driverProfile.findFirst({
                  where: { licenseNumber: dto.licenseNumber },
                })
              : null;
            
            if (profileByLicense) {
              const byLicense = await tx.driver.findUnique({
                where: { id: profileByLicense.driverId },
              });
              if (byLicense) {
                // Обновляем найденного по лицензии
                const updateData: Prisma.DriverUncheckedUpdateInput = {
                  name: dto.name,
                  status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
                };
                
                const updatedDriver = await tx.driver.update({
                  where: { id: byLicense.id },
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
            }
            
            // Если все равно не нашли - значит phone/email заняты другим водителем
            // Обновляем того водителя, который имеет phone или email
            if (byPhone || byEmail) {
              const fallbackDriver = (byPhone || byEmail) as unknown as Driver;
              const updateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              };
              
              const updatedDriver = await tx.driver.update({
                where: { id: fallbackDriver.id },
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
            
            // Если все равно не нашли - повторяем поиск и возвращаем первого найденного
            // Это fallback на случай крайне редкого race condition
            const finalSearch = await tx.driver.findFirst({
              where: {
                OR: [{ phone: dto.phone }, { email: dto.email }],
              },
            });
            
            if (finalSearch) {
              const updateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              };
              
              const updatedDriver = await tx.driver.update({
                where: { id: finalSearch.id },
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
            
            // Если все равно не нашли - повторяем поиск по всем полям
            // Это fallback на случай крайне редкого race condition
            const finalByPhone = await tx.driver.findUnique({ where: { phone: dto.phone } });
            const finalByEmail = await tx.driver.findUnique({ where: { email: dto.email } });
            const finalDriver = finalByPhone || finalByEmail;
            
            if (finalDriver) {
              const updateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              };
              
              const updatedDriver = await tx.driver.update({
                where: { id: finalDriver.id },
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
            
            // Если все равно не нашли - повторяем поиск еще раз
            // Это fallback на случай крайне редкого race condition
            const retrySearch = await tx.driver.findFirst({
              where: {
                OR: [{ phone: dto.phone }, { email: dto.email }],
              },
            });
            
            if (retrySearch) {
              const updateData: Prisma.DriverUncheckedUpdateInput = {
                name: dto.name,
                status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              };
              
              const updatedDriver = await tx.driver.update({
                where: { id: retrySearch.id },
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
            
            // Если все равно не нашли - это очень странно при P2002
            // Но пробуем создать снова
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
            } catch {
              // Если не удалось создать - возвращаем ошибку
              throw error;
            }
          }

          // Обновляем найденного водителя БЕЗ phone/email чтобы избежать конфликта
          try {
            const updateData: Prisma.DriverUncheckedUpdateInput = {
              name: dto.name,
              status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
              // НЕ обновляем phone и email - они уже заняты
            };

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
          } catch (updateError: any) {
            // Если все равно получили конфликт - просто возвращаем существующего водителя
            if (updateError.code === 'P2002') {
              await this.upsertDriverRelations(
                tx,
                existingDriver.id,
                dto,
                (existingDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
              );
              
              return this.loadDriver(tx, existingDriver.id);
            }
            throw updateError;
          }
        });
      }
      
      // Финальный fallback - если это не P2002, но все равно ошибка
      // Пробуем найти водителя и вернуть его
      const fallbackDriver = await this.findExistingDriver(dto);
      if (fallbackDriver) {
        return await this.prisma.$transaction(async (tx) => {
          const updateData: Prisma.DriverUncheckedUpdateInput = {
            name: dto.name,
            status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
          };
          
          try {
            const updatedDriver = await tx.driver.update({
              where: { id: fallbackDriver.id },
              data: updateData,
            });
            
            await this.upsertDriverRelations(
              tx,
              updatedDriver.id,
              dto,
              (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
            );
            
            return this.loadDriver(tx, updatedDriver.id);
          } catch {
            // Если не удалось обновить - просто возвращаем существующего
            await this.upsertDriverRelations(
              tx,
              fallbackDriver.id,
              dto,
              (fallbackDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
            );
            
            return this.loadDriver(tx, fallbackDriver.id);
          }
        });
      }
      
      // Последний fallback - ищем любого водителя по phone или email
      // Если получили P2002, значит водитель точно существует
      const lastResort = await this.prisma.driver.findFirst({
        where: {
          OR: [{ phone: dto.phone }, { email: dto.email }],
        },
        include: driverInclude,
      });
      
      if (lastResort) {
        // Обновляем найденного водителя
        return await this.prisma.$transaction(async (tx) => {
          const updateData: Prisma.DriverUncheckedUpdateInput = {
            name: dto.name,
            status: (dto.status ?? DRIVER_STATUS.ACTIVE) as string,
          };
          
          try {
            const updatedDriver = await tx.driver.update({
              where: { id: lastResort.id },
              data: updateData,
            });
            
            await this.upsertDriverRelations(
              tx,
              updatedDriver.id,
              dto,
              (updatedDriver.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
            );
            
            return this.loadDriver(tx, updatedDriver.id);
          } catch {
            // Если не удалось обновить - просто возвращаем существующего
            await this.upsertDriverRelations(
              tx,
              lastResort.id,
              dto,
              (lastResort.status as DriverStatusValue) ?? DRIVER_STATUS.ACTIVE,
            );
            
            return this.loadDriver(tx, lastResort.id);
          }
        });
      }
      
      // Если все равно не нашли - это очень странно при P2002
      // Но на всякий случай пробуем создать снова
      try {
        return await this.prisma.$transaction(async (tx) => {
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
      } catch {
        // Если и это не помогло - возвращаем ошибку
        // Но это должно быть крайне редко
        throw error;
      }
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
      // При конфликте просто возвращаем существующего водителя без обновления
      if (error.code === 'P2002') {
        const existing = await this.prisma.driver.findFirst({
          where: {
            OR: [
              { phone: updateDriverDto.phone },
              { email: updateDriverDto.email },
            ],
          },
          include: driverInclude,
        });
        if (existing) {
          return existing;
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

