import { Module } from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import TenantUserController from './tenant-user.controller';
import {TenantAuthModule} from "../tenant-auth/tenant-auth.module";

@Module({
  imports: [TenantAuthModule],
  controllers: [TenantUserController],
  providers: [TenantUserService],
  exports: [TenantUserService]
})
export class TenantUserModule {}
