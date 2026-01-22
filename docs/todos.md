# Порядок реализации модулей (примерный roadmap)

## Критическая инфраструктура (1–2 недели)

- [X] ConfigModule + Env validation (TENANT_DATABASE_URL и другие)
- [X] PrismaModule + PrismaService (с автоматическим фильтром по organizationId)
- [ ] AuthModule (JWT + refresh tokens + local strategy) для Tenant only Cookie comunication
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
- [ ] PaymentsModule (платежи — приход/расход/перевод)
- [ ] PurchasesModule + PurchaseItems (закупки + позиции)
- [ ] InstallmentsModule + InstallmentPayments (рассрочки)

## История и аудит

- [ ] TransactionsModule (движение денег, баланс клиента)
- [ ] ProductTransactionsModule (история перемещений товаров)
- [ ] AuditLogsModule (журнал действий пользователей)

## Дополнительно / позже

- [ ] DocumentsModule (прикреплённые файлы, счета, акты)
- [ ] Notifications (если будут push/email/sms)
- [ ] Reports / Analytics (отчёты по продажам, остаткам, долгам)
- [ ] Swagger + API документация
- [ ] Unit + E2E тесты
- [ ] Rate limiting, security headers, CORSnk