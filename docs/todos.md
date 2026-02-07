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
[decisions.md](decisions.md)
- [X] TransactionsModule (движение денег, баланс клиента)
- [X] ProductTransactionsModule (история перемещений товаров)
- [x] AuditLogsModule (журнал действий пользователей)

## Дополнительно / позже

- [X] замена tenant.id на organization.id
- [x] DocumentsModule (прикреплённые файлы, счета, акты)
- [ ] Notifications (если будут push/email/sms)
- [X] Reports / Analytics (отчёты по продажам, остаткам, долгам)
- [ ] Swagger + API документация
- [ ] Unit + E2E тесты
- [ ] Rate limiting, security headers, CORSnk
- [X] Автоматическая проверка просрочки Можно добавить cron-задачу (например, через @nestjs/schedule), которая каждый день проверяет dueDate и меняет статус на OVERDUE.
- [X] Отмена рассрочки Можно добавить метод cancelInstallment, который вернёт статус CANCELLED и скорректирует баланс клиента.
- [X] Добавить модуль возвратов (ReturnsModule)?
- [ ] Полная проверка правы на контролерах (Roles)
- [ ] csrf middleware


- [ ] type SaleItem =
| { productVariantId; quantity; price }
| { productVariantId; instanceId; price; quantity?: never }

Это убирает 50% runtime-проверок.




## Задать вопрос
* [ ] **Логика отмены рассрочки**: Если мы отменяем рассрочку, возвращаем ли мы средства на баланс клиента или в кассу? Нужно ли создавать обратный платеж (Expense)?
* [ ] **Глубина хранения**: Сколько времени храним AuditLog в основной базе перед архивацией?

# 📝 План внедрения AuditLog (Журнал действий)
* [ ] **Интеграция в UsersModule**: логирование смены ролей и блокировки.
* [ ] **Интеграция в ProductInstanceModule**: логирование смены владельцев и статусов (SOLD/LOST).
* [ ] **Интеграция в FinanceModule**: логирование создания платежей и корректировок касс.
* [ ] **Интеграция в Sales/Purchases**: логирование отмены и подтверждения сделок.

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
