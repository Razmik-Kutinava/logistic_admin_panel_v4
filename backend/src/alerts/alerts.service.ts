import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto, AlertStatus } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert } from '@prisma/client';

const alertInclude = {
  actions: {
    orderBy: {
      timestamp: 'desc' as const,
    },
  },
};

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    return this.prisma.alert.create({
      data: {
        type: dto.type,
        payload: dto.payload || {},
        status: dto.status || AlertStatus.PENDING,
      },
      include: alertInclude,
    });
  }

  async findAll(status?: AlertStatus): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: status ? { status } : undefined,
      include: alertInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: alertInclude,
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  async update(id: string, dto: UpdateAlertDto, actor?: string): Promise<Alert> {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const alert = await tx.alert.update({
        where: { id },
        data: {
          status: dto.status,
        },
      });

      // Create action log
      await tx.alertAction.create({
        data: {
          alertId: id,
          actor: actor || 'system',
          action: `status_changed_to_${dto.status}`,
        },
      });

      return tx.alert.findUnique({
        where: { id },
        include: alertInclude,
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.alert.delete({ where: { id } });
  }
}
