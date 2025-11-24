# Logistic Admin Panel

Проект админ-панели логистической компании.

## Структура проекта

```
├── backend/        # Backend на NestJS + Prisma + Supabase
├── frontend/       # Frontend приложение (будет на SolidJS)
└── docs/          # Документация
```

## Технологии

### Backend
- NestJS
- TypeScript
- Prisma ORM
- Supabase (PostgreSQL)

### Frontend (планируется)
- SolidJS
- TypeScript
- Vite

## Быстрый старт

### Backend
```bash
cd backend
npm install
# Настройте .env файл с данными от Supabase
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Подробные инструкции по настройке смотрите в `backend/SETUP.md`

## Документация

См. папку `/docs` для подробной документации:
- `ARCHITECTURE.md` - архитектура проекта
- `API.md` - документация API
- `SETUP.md` - общие инструкции по настройке

## Текущий статус

✅ Backend структура создана
✅ Модуль Driver (Водитель) реализован
⏳ Frontend будет реализован позже

