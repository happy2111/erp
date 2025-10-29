import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantUserModule } from './tenant-user/tenant-user.module';
import { PrismaTenantModule } from './prisma_tenant/prisma_tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    TenantsModule,
    TenantUserModule,
    PrismaTenantModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
