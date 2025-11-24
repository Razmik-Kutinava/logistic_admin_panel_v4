# API Документация

## Базовый URL
```
http://localhost:3000/api
```

## Driver (Водитель) Endpoints

### Получить список всех водителей

**GET** `/api/drivers`

**Query параметры:**
- `status` (опционально) - фильтр по статусу: `active`, `inactive`, `on_shift`

**Пример запроса:**
```bash
GET /api/drivers
GET /api/drivers?status=active
```

**Ответ (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Иван Иванов",
    "phone": "+79001234567",
    "email": "ivan@example.com",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Получить водителя по ID

**GET** `/api/drivers/:id`

**Параметры:**
- `id` - UUID водителя

**Пример запроса:**
```bash
GET /api/drivers/123e4567-e89b-12d3-a456-426614174000
```

**Ответ (200 OK):**
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Ошибка (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Водитель с ID {id} не найден",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/drivers/{id}"
}
```

---

### Создать нового водителя

**POST** `/api/drivers`

**Тело запроса:**
```json
{
  "name": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "status": "active"
}
```

**Обязательные поля:**
- `name` (string) - имя и фамилия
- `phone` (string) - номер телефона (уникальный, формат: +79001234567)
- `email` (string) - email (уникальный)

**Опциональные поля:**
- `status` (enum) - статус: `active`, `inactive`, `on_shift` (по умолчанию: `active`)

**Ответ (201 Created):**
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Ошибка (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Водитель с такими данными уже существует",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/drivers"
}
```

---

### Обновить данные водителя

**PATCH** `/api/drivers/:id`

**Параметры:**
- `id` - UUID водителя

**Тело запроса (все поля опциональны):**
```json
{
  "name": "Петр Петров",
  "email": "newemail@example.com"
}
```

**Ответ (200 OK):**
```json
{
  "id": "uuid",
  "name": "Петр Петров",
  "phone": "+79001234567",
  "email": "newemail@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Изменить статус водителя

**PATCH** `/api/drivers/:id/status`

**Параметры:**
- `id` - UUID водителя

**Тело запроса:**
```json
{
  "status": "on_shift"
}
```

**Доступные статусы:**
- `active` - активный
- `inactive` - неактивный
- `on_shift` - водитель в активной смене

**Ответ (200 OK):**
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "status": "on_shift",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Удалить водителя (soft delete)

**DELETE** `/api/drivers/:id`

**Параметры:**
- `id` - UUID водителя

**Описание:**
Выполняет мягкое удаление - устанавливает статус `inactive` вместо физического удаления записи.

**Ответ (204 No Content)**
Без тела ответа

---

## Коды ошибок

- `400 Bad Request` - ошибка валидации данных
- `404 Not Found` - ресурс не найден
- `409 Conflict` - конфликт данных (например, дублирование уникальных полей)
- `500 Internal Server Error` - внутренняя ошибка сервера

## Статусы водителя (DriverStatus)

- `active` - активный водитель
- `inactive` - неактивный водитель
- `on_shift` - водитель в активной смене
