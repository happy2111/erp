import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantUserModule } from './tenant-user/tenant-user.module';
import { PrismaTenantModule } from './prisma_tenant/prisma_tenant.module';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { TenantAuthModule } from './tenant-auth/tenant-auth.module';
import { MainUserModule } from './main-user/main-user.module';
import { OrganizationUserModule } from './organization-user/organization-user.module';
import { OrganizationCustomerModule } from './organization-customer/organization-customer.module';
import { BrandsModule } from './brands/brands.module';
import { CategoryModule } from './category/category.module';
import { CurrencyModule } from './currency/currency.module';
import { CurrencyRateModule } from './currency-rate/currency-rate.module';
import { ProductsModule } from './products/products.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { AttributesModule } from './attributes/attributes.module';
import { CodeGeneraterModule } from './code-generater/code-generater.module';
import { ProductCategoryModule } from './product-category/product-category.module';
import { ProductPriceModule } from './product-price/product-price.module';
import { ProductBatchModule } from './product-batch/product-batch.module';
import { ProductInstanceModule } from './product-instance/product-instance.module';
import { MainUserRefreshTokenModule } from './main-user-refresh-token/main-user-refresh-token.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { S3Module } from './s3/s3.module';
import { KassasModule } from './kassas/kassas.module';
import { KassaTransfersModule } from './kassa-transfers/kassa-transfers.module';
import { SalesModule } from './sales/sales.module';
import { StocksModule } from './stocks/stocks.module';
import { PaymentsModule } from './payments/payments.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InstallmentsModule } from './installments/installments.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsModule } from './transactions/transactions.module';
import { ProductTransactionsModule } from './product-transactions/product-transactions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    TenantsModule,
    TenantUserModule,
    MainUserModule,
    PrismaTenantModule,
    OrganizationModule,
    OrganizationUserModule,
    OrganizationCustomerModule,
    AuthModule,
    TenantAuthModule,
    BrandsModule,
    CategoryModule,
    CurrencyModule,
    CurrencyRateModule,
    ProductsModule,
    ProductVariantsModule,
    AttributesModule,
    CodeGeneraterModule,
    ProductCategoryModule,
    ProductPriceModule,
    ProductBatchModule,
    ProductInstanceModule,
    MainUserRefreshTokenModule,
    S3Module,
    KassasModule,
    KassaTransfersModule,
    SalesModule,
    StocksModule,
    PaymentsModule,
    PurchasesModule,
    InstallmentsModule,
    TasksModule,
    TransactionsModule,
    ProductTransactionsModule,
    AuditLogsModule,
    DocumentsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
