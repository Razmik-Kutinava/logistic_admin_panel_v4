import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma автоматически использует DATABASE_URL из переменных окружения
    // Не передаем конфигурацию, чтобы избежать ошибок с engine type
    super();
    
    // Проверяем наличие DATABASE_URL
    if (!process.env.DATABASE_URL) {
      this.logger.warn('DATABASE_URL не найден в переменных окружения');
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Подключение к базе данных установлено');
    } catch (error) {
      this.logger.error('Ошибка подключения к базе данных:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Отключение от базы данных');
  }
}

