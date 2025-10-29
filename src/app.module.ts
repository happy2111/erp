import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantUserModule } from './tenant-user/tenant-user.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    PrismaModule,
    TenantsModule,
    TenantUserModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
