# Порядок реализации модулей (примерный roadmap)

## Критическая инфраструктура (1–2 недели)

- [X] ConfigModule + Env validation (TENANT_DATABASE_URL и другие)
- [X] PrismaModule + PrismaService (с автоматическим фильтром по organizationId)
- [X] AuthModule (JWT + refresh tokens + local strategy) для Tenant only Cookie communication
- [X] UsersModule (CRUD пользователей, профили, роли, телефоны)
- [X] RolesModule (роли пользователей и роли внутри организации)
- [X] OrganizationsModule (CRUD организаций + owner logic)
- [X] Tenant/Organization Context (middleware/guard + CLS/nestjs-cls + current organization)

## Базовые справочники и настройки

- [X] CurrenciesModule (валюты + курсы CurrencyRate)
- [ ] SettingsModule (настройки организации: валюта по умолчанию, налог, рассрочка и т.д.)

## Каталог товаров (самая сложная часть)

- [X] BrandsModule (бренды)
- [X] AttributesModule + AttributeValues (характеристики товаров)
- [X] CategoriesModule + ProductCategories (категории)
- [X] ProductsModule (основные товары)
- [X] ProductVariantsModule (варианты товаров + SKU, barcode)
- [X] ProductVariantAttributes (связь вариантов с атрибутами)
- [X] ProductImagesModule (фото товаров и вариантов)

## Склад и инвентаризация

- [X] ProductInstancesModule (серийные номера, статусы экземпляров)
- [X] ProductBatchesModule (партии, сроки годности)
- [X] StocksModule (остатки по organization + variant)

## Финансы и кассы

- [x] KassasModule (кассы организации)
- [x] KassaTransfersModule (переводы между кассами)

## Клиенты и контрагенты

- [X] OrganizationCustomersModule (клиенты + поставщики, черный список)

## Основные бизнес-процессы

- [x] SalesModule + SaleItems (продажи + позиции)
- [x] PurchasesModule + PurchaseItems (закупки + позиции)
- [x] InstallmentsModule + InstallmentPayments (рассрочки)

## История и аудит

- [X] TransactionsModule (движение денег, баланс клиента)
- [X] ProductTransactionsModule (история перемещений товаров)
- [x] AuditLogsModule (журнал действий пользователей)

## Дополнительно / позже

- [X] замена tenant.id на organization.id
- [ ] DocumentsModule (прикреплённые файлы, счета, акты)
- [ ] Notifications (если будут push/email/sms)
- [ ] Reports / Analytics (отчёты по продажам, остаткам, долгам)
- [ ] Swagger + API документация
- [ ] Unit + E2E тесты
- [ ] Rate limiting, security headers, CORSnk
- [X] Автоматическая проверка просрочки Можно добавить cron-задачу (например, через @nestjs/schedule), которая каждый день проверяет dueDate и меняет статус на OVERDUE.
- [ ] Отмена рассрочки Можно добавить метод cancelInstallment, который вернёт статус CANCELLED и скорректирует баланс клиента.
- [ ] Добавить модуль возвратов (ReturnsModule)?
- [ ] Полная проверка правы на контролерах (Roles)
- [ ] csrf middleware


## Задать вопрос
- [ ] Если отменить рассрочку, то возврат заплаченных средств вернут обратно
  Прекрасный план. Я систематизировал твой запрос в структурированный Markdown-файл с четким разделением ответственности и списком задач в формате TODO.

---

# 📝 План внедрения AuditLog (Журнал действий)

## 🎯 Основной принцип: Что логировать

---

## 📋 Карта покрытия сущностей

| Сущность | Методы | Тип Action | Примечание |
| --- | --- | --- | --- |
| **Organization** | create, update, delete | `CREATE`, `UPDATE`, `DELETE` | Критично для платформы |
| **User** | create, update, delete | `CREATE`, `UPDATE_ROLE`, `DELETE` | Особенно важно поле `role` и `isActive` |
| **ProductInstance** | *Все методы* | `SOLD`, `RETURNED`, `LOST`, etc. | **Самая важная часть**: движение серийников |
| **Sale / Purchase** | create, confirm, cancel | `CREATE`, `PAID`, `CANCELLED` | Движение больших денежных потоков |
| **Payment** | create, delete | `INCOME`, `EXPENSE`, `DELETE` | Все кассовые операции |
| **Installment** | create, pay, cancel | `CREATE`, `PAYMENT`, `CANCELLED` | Долги клиентов |
| **Kassa** | create, update, delete | `CREATE`, `UPDATE_BALANCE` | Контроль остатков в кассах |

---

## 🛠 Примеры реализации (Snippet)

### 1. Продажа (Транзакционный лог)

```ts
// Внутри SalesService.confirm()
await this.auditHelper.log(tx, organizationId, {
  userId: currentUser.id,
  action: 'CONFIRM_SALE',
  entity: 'Sale',
  entityId: sale.id,
  newValue: { status: 'PAID' },
  note: `Продажа №${sale.invoiceNumber} подтверждена`,
});

```

### 2. Удаление (Фиксация состояния "ДО")

```ts
// Внутри Service.remove()
await this.auditHelper.log(tx, organizationId, {
  userId: currentUser.id,
  action: 'DELETE',
  entity: 'ProductInstance',
  entityId: id,
  oldValue: existingData, // Сохраняем, что именно удалили
  note: 'Удаление экземпляра товара',
});

```

---

## 🚀 План работ (TODO)

### Приоритетные задачи (AuditLog Integration)

* [ ] **Интеграция в UsersModule**: логирование смены ролей и блокировки.
* [ ] **Интеграция в ProductInstanceModule**: логирование смены владельцев и статусов (SOLD/LOST).
* [ ] **Интеграция в FinanceModule**: логирование создания платежей и корректировок касс.
* [ ] **Интеграция в Sales/Purchases**: логирование отмены и подтверждения сделок.

### Дополнительно / Позже

* [ ] замена `tenant.id` на `organization.id` во всей системе
* [ ] **DocumentsModule** (прикреплённые файлы, счета, акты)
* [ ] **Notifications** (push/email/sms для просрочек)
* [ ] **Reports / Analytics** (генерация PDF отчетов на основе AuditLog)
* [ ] Swagger + API документация (полное описание AuditLog схемы)
* [ ] Unit + E2E тесты для проверки записи логов
* [ ] Rate limiting, security headers, CORS
* [x] **Автоматическая проверка просрочки**: Добавлена cron-задача для смены статуса на OVERDUE.
* [ ] **Отмена рассрочки**: Метод `cancelInstallment` с корректировкой баланса.
* [ ] **ReturnsModule**: Модуль возвратов товаров от клиентов.
* [ ] Полная проверка прав на контроллерах (Roles/Guards)
* [ ] CSRF middleware

---

## ❓ Вопросы к обсуждению

* [ ] **Логика отмены рассрочки**: Если мы отменяем рассрочку, возвращаем ли мы средства на баланс клиента или в кассу? Нужно ли создавать обратный платеж (Expense)?
* [ ] **Глубина хранения**: Сколько времени храним AuditLog в основной базе перед архивацией?

---

**Что делаем следующим шагом?**

1. Внедряем `AuditLog` в `SalesService` (как пример сложной интеграции)?
2. Или переходим к разработке **DocumentsModule**?