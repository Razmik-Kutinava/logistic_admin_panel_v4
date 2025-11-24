# Архитектура проекта

## Общее описание

Проект админ-панели логистической компании состоит из двух основных частей:
- **Backend** - серверная часть на NestJS/TypeScript
- **Frontend** - клиентская часть на SolidJS/Vite/TypeScript

## Структура

### Backend (NestJS)
- **Фреймворк**: NestJS
- **Язык**: TypeScript со строгой типизацией
- **ORM**: Prisma для работы с базой данных
- **База данных**: Supabase (PostgreSQL)
- **Валидация**: class-validator, class-transformer
- **Архитектура**: Модульная архитектура (modules, controllers, services)

**Структура модулей:**
```
src/
├── drivers/          # Модуль водителей
│   ├── dto/         # Data Transfer Objects
│   ├── drivers.controller.ts
│   ├── drivers.service.ts
│   └── drivers.module.ts
├── prisma/          # Prisma сервис
├── common/          # Общие утилиты и фильтры
└── app.module.ts    # Главный модуль
```

### Frontend (SolidJS)
- **Фреймворк**: SolidJS
- **Сборщик**: Vite
- **Язык**: TypeScript
- **Состояние**: Реактивная система SolidJS

## Коммуникация

Frontend и Backend взаимодействуют через REST API с префиксом `/api`.

## Доменная модель

### Driver (Водитель) - реализовано
Основные поля:
- Личная информация: `name`, `phone`, `email`
- Статусы: `active`, `inactive`, `on_shift`
- Таймстемпы: `created_at`, `updated_at`
- Связанные домены:
  - `driver_status_logs` — история изменений статуса
  - `gps_logs` — GPS координаты, скорость, точность
  - `shifts` — смены, выполненные заказы, дистанция
  - `devices` — устройства драйверов, push токены

### Будущие домены (планируется)
- Vehicle (Автомобиль)
- Delivery (Доставка)
- Order (Заказ)
- и другие...

