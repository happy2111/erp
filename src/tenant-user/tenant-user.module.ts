import { Module } from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import { TenantUserController } from './tenant-user.controller';

@Module({
  controllers: [TenantUserController],
  providers: [TenantUserService],
})
export class TenantUserModule {}
