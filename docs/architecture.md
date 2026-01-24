# Authorization Architecture (Tenant + Organization)

Этот документ описывает **полный процесс аутентификации и авторизации пользователя** в системе с:

* multi-tenant архитектурой
* пользователями, связанными с несколькими организациями
* cookie-based JWT (access + refresh)
* выбором активной организации

Документ предназначен для того, чтобы **быстро восстановить картину в голове после паузы**: что, зачем и в каком порядке происходит.

---

## Основные сущности

### Tenant

* Представляет отдельного клиента системы (определяется по `hostname`)
* Имеет собственную БД (через `PrismaTenantService`)
* Используется для изоляции данных

### User

* Физический пользователь (email / phone / password)
* Может быть связан с **несколькими организациями**

### Organization

* Бизнес-единица внутри tenant
* Пользователь связан с организацией через `OrganizationUser`

### OrganizationUser

* Связка `User ↔ Organization`
* Содержит:

    * `role` (ADMIN, MANAGER, ...)
    * используется как **контекст авторизации**

---

## Типы JWT

### 1. Temporary JWT (ORG_SELECTION)

Используется **только** когда у пользователя более одной организации.

Payload:

```ts
{
  sub: userId,
  tenantId,
  purpose: 'ORG_SELECTION'
}
```

Особенности:

* Живёт **5 минут**
* Хранится в `accessToken` cookie
* **НЕ содержит** orgId, orgUserId, role
* Используется **только** для `/switch-organization`

---

### 2. Full JWT (Authenticated)

Используется для всех защищённых API.

Payload:

```ts
{
  sub: userId,
  tenantId,
  orgId,
  orgUserId,
  role
}
```

Особенности:

* Access Token: ~15 минут
* Refresh Token: ~7 дней
* Хранится в httpOnly cookies
* Определяет **активную организацию пользователя**

---

## Полный процесс авторизации

### Шаг 1. Login

```
POST /tenant-auth/login
```

1. Tenant определяется по `hostname`
2. Пользователь ищется по email / phone
3. Проверяется пароль
4. Загружаются `org_links`

#### Варианты:

##### 🔹 Пользователь без организаций

→ ❌ Ошибка

##### 🔹 Одна организация

→ ✅ Сразу выдаётся **Full JWT**

##### 🔹 Несколько организаций

→ ⚠️ Выдаётся **Temporary JWT (ORG_SELECTION)**

Response:

```json
{
  "requiresOrgSelection": true,
  "organizations": [
    { "orgUserId": "...", "orgId": "...", "role": "ADMIN" }
  ]
}
```

---

### Шаг 2. Выбор организации (Frontend)

Frontend:

* показывает список организаций
* пользователь выбирает одну
* отправляет `orgUserId`

---

### Шаг 3. Switch Organization

```
POST /tenant-auth/switch-organization
```

Guards:

* `JwtAuthGuard` (проверяет Temporary JWT)
* `ApiKeyGuard`

Проверки:

1. JWT содержит `purpose = ORG_SELECTION`
2. `orgUserId` принадлежит пользователю
3. `tenant` совпадает

После проверки:
→ ❇️ Выдаётся **Full JWT** (access + refresh)

---

### Шаг 4. Использование API

Все защищённые эндпоинты:

* используют `JwtAuthGuard`
* получают пользователя через `@CurrentUser()`
* получают tenant через `@CurrentTenant()`

Контекст всегда:

* userId
* tenantId
* orgId
* role

---

### Шаг 5. Refresh Token

```
POST /tenant-auth/refresh
```

1. Refresh Token берётся из cookie
2. Проверяется JWT
3. Проверяется активность пользователя
4. Выдаются новые access + refresh cookies

---

### Шаг 6. Logout

```
POST /tenant-auth/logout
```

* Очищает `accessToken` и `refreshToken` cookies

---

## Guards и Decorators

### JwtAuthGuard

* Извлекает JWT из cookies
* Использует `JwtStrategy`
* Поддерживает:

    * Temporary JWT
    * Full JWT

### ApiKeyGuard

* Проверяет принадлежность запроса tenant

### @CurrentTenant()

* Достаёт tenant из `request.tenant`

### @CurrentUser()

* Достаёт `JwtUser` из `request.user`
* Поддерживает выбор конкретного поля

---

## Ключевые принципы

* ❌ Нет JWT без выбора организации
* ❌ Нельзя использовать Temporary JWT для API
* ✅ Контекст всегда определяется через `OrganizationUser`
* ✅ JWT = текущая активная организация
* ✅ Cookies = httpOnly (XSS-safe)

---

## Зачем всё это

* Безопасный multi-org доступ
* Чёткий auth flow
* Простое масштабирование
* Понятная ментальная модель

---

**Если ты читаешь этот файл после паузы — начни с раздела *"Полный процесс авторизации"***



## Методы работы с транзакциями

| Метод | Зачем нужен | Пример использования |
|------|-------------|----------------------|
| `create` | Основной метод создания транзакции | Продажа, возврат, списание |
| `findAll` | Получение списка всех транзакций с фильтрами и пагинацией | Отчёт по складу за месяц |
| `findByInstance` | Полная история по конкретному экземпляру товара (серийный номер) | Проверка пути товара |
| `getLastTransactions` | Получение последних N транзакций | Последние 5 операций в карточке товара |
| `getStatistics` | Статистика по товару: сколько раз продавался, возвращался и т.д. | Аналитика по товару |
| `remove` | Удаление транзакции (доступно только администраторам) | Исправление ошибочной транзакции |
| `updateDescription` | Изменение описания транзакции | Админское исправление комментария |

