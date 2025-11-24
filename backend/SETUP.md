# Инструкция по настройке Backend

## Шаг 1: Установка зависимостей

```bash
cd backend
npm install
```

## Шаг 2: Настройка переменных окружения

1. Создайте файл `.env` в папке `backend/`
2. Скопируйте значения из `.env.example` или создайте с следующими переменными:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.rfrnplvnsqrtxmdyytit.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.rfrnplvnsqrtxmdyytit.supabase.co:5432/postgres?sslmode=require"
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://rfrnplvnsqrtxmdyytit.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcm5wbHZuc3FydHhtZHl5dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjM3NjYsImV4cCI6MjA3OTQ5OTc2Nn0.7DtJJDhBD3Fzc2G4qj14RSYg-Q8wwxtBqPOm-jb3NBw
```

**Для Supabase:**
- Перейдите в настройки проекта Supabase
- Найдите Connection String в разделе Database Settings
- Используйте Connection Pooling для `DATABASE_URL`
- Используйте Direct Connection для `DIRECT_URL` (для migrations)

## Шаг 3: Настройка Prisma

1. Сгенерируйте Prisma Client:
```bash
npm run prisma:generate
```

2. Синхронизируйте схему с Supabase (при наличии доступа к интернету):
```bash
npx prisma db pull
```

3. Создайте и примените миграцию (если поднимаете локальную БД):
```bash
npm run prisma:migrate
```

При первом запуске вам будет предложено ввести имя миграции, например: `init`

## Шаг 4: Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000/api`

## Проверка работы

Откройте браузер и перейдите по адресу:
- Список водителей: `http://localhost:3000/api/drivers`
- Должен вернуться пустой массив `[]` (если нет данных) или список водителей

## Полезные команды

- `npm run prisma:studio` - открыть Prisma Studio для просмотра и редактирования данных в базе
- `npm run build` - сборка проекта
- `npm run start:prod` - запуск в production режиме

