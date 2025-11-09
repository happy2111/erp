import { Module } from '@nestjs/common';
import { OrganizationUserService } from './organization-user.service';
import { OrganizationUserController } from './organization-user.controller';
import {TenantAuthModule} from "../tenant-auth/tenant-auth.module";
import {TenantUserModule} from "../tenant-user/tenant-user.module";

@Module({
  imports: [TenantAuthModule, TenantUserModule],
  controllers: [OrganizationUserController],
  providers: [OrganizationUserService],
  exports: [OrganizationUserService],
})
export class OrganizationUserModule {}
