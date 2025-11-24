# Backend - Delivery App

## Описание

Backend часть приложения логистической компании на NestJS с Prisma ORM и Supabase.

## Технологии

- NestJS
- TypeScript
- Prisma ORM
- Supabase (PostgreSQL)
- class-validator

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте `.env.example` в `.env`
2. Заполните необходимые переменные окружения:
   - `DATABASE_URL` - Connection Pooling URL от Supabase PostgreSQL
   - `DIRECT_URL` - Direct connection URL для миграций
   - `PORT` - порт приложения (по умолчанию 3000)

3. Генерация Prisma Client:
```bash
npm run prisma:generate
```

4. Синхронизация с базой данных Supabase:
```bash
npx prisma db pull
```

> Команда требует доступ к интернету и открытому выходу на `db.rfrnplvnsqrtxmdyytit.supabase.co`. Если окружение не позволяет подключиться к внешней сети, пропустите шаг и доверьтесь существующей схеме.

5. Применение миграций базы данных (если базу нужно поднять локально):
```bash
npm run prisma:migrate
```

## Запуск

### Разработка
```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000/api`

### Сборка
```bash
npm run build
```

### Production
```bash
npm run start:prod
```

## Prisma команды

- `npm run prisma:generate` - генерация Prisma Client
- `npm run prisma:migrate` - создание и применение миграций
- `npm run prisma:studio` - открыть Prisma Studio для просмотра данных

## Структура проекта

```
src/
├── drivers/          # Модуль водителей
│   ├── dto/         # Data Transfer Objects
│   ├── drivers.controller.ts
│   ├── drivers.service.ts
│   └── drivers.module.ts
├── prisma/          # Prisma сервис
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── common/          # Общие утилиты
│   └── filters/     # Exception filters
├── app.module.ts    # Главный модуль
└── main.ts          # Точка входа
```

## API Документация

См. `/docs/API.md` для полной документации API.

