import { Module } from '@nestjs/common';
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
import { StockModule } from './stock/stock.module';
import { ProductBatchModule } from './product-batch/product-batch.module';

@Module({
  imports: [
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
    StockModule,
    ProductBatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
