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
    AuthModule,
    TenantAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
