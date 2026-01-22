# Порядок реализации модулей (примерный roadmap)

## Критическая инфраструктура (1–2 недели)

- [ ] ConfigModule + Env validation (TENANT_DATABASE_URL и другие)
- [ ] PrismaModule + PrismaService (с автоматическим фильтром по organizationId)
- [ ] AuthModule (JWT + refresh tokens + local strategy)
- [ ] UsersModule (CRUD пользователей, профили, роли, телефоны)
- [ ] RolesModule (роли пользователей и роли внутри организации)
- [ ] OrganizationsModule (CRUD организаций + owner logic)
- [ ] Tenant/Organization Context (middleware/guard + CLS/nestjs-cls + current organization)

## Базовые справочники и настройки

- [ ] CurrenciesModule (валюты + курсы CurrencyRate)
- [ ] SettingsModule (настройки организации: валюта по умолчанию, налог, рассрочка и т.д.)

## Каталог товаров (самая сложная часть)

- [ ] BrandsModule (бренды)
- [ ] AttributesModule + AttributeValues (характеристики товаров)
- [ ] CategoriesModule + ProductCategories (категории)
- [ ] ProductsModule (основные товары)
- [ ] ProductVariantsModule (варианты товаров + SKU, barcode)
- [ ] ProductVariantAttributes (связь вариантов с атрибутами)
- [ ] ProductImagesModule (фото товаров и вариантов)

## Склад и инвентаризация

- [ ] ProductInstancesModule (серийные номера, статусы экземпляров)
- [ ] ProductBatchesModule (партии, сроки годности)
- [ ] StocksModule (остатки по organization + variant)

## Финансы и кассы

- [ ] KassasModule (кассы организации)
- [ ] KassaTransfersModule (переводы между кассами)

## Клиенты и контрагенты

- [ ] OrganizationCustomersModule (клиенты + поставщики, черный список)

## Основные бизнес-процессы

- [ ] SalesModule + SaleItems (продажи + позиции)
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