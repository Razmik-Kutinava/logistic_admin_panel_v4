# Архитектура проекта

## Общее описание

Проект доставки состоит из двух основных частей:
- **Backend** - серверная часть на Node.js/TypeScript
- **Frontend** - клиентская часть на Vite/TypeScript

## Структура

### Backend
- Использует TypeScript
- База данных через Prisma ORM
- REST API

### Frontend
- Использует Vite как сборщик
- TypeScript для типобезопасности
- React/Vue (в зависимости от выбора)

## Коммуникация

Frontend и Backend взаимодействуют через REST API.

