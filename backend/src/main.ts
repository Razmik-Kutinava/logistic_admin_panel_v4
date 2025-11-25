import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс для всех роутов
  app.setGlobalPrefix('api');

  // Глобальная обработка ошибок
  app.useGlobalFilters(new HttpExceptionFilter());

  // Включение валидации
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Смягчаем валидацию для отладки
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // Автоматическое преобразование типов
      },
      exceptionFactory: (errors) => {
        // Возвращаем детальные ошибки валидации
        const messages = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        }));
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Ошибка валидации',
            errors: messages,
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );

  // CORS настройки
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();

