import { Module } from '@nestjs/common';
import { OrganizationUserService } from './organization-user.service';
import { OrganizationUserController } from './organization-user.controller';
import {TenantAuthModule} from "../tenant-auth/tenant-auth.module";

@Module({
  imports: [TenantAuthModule],
  controllers: [OrganizationUserController],
  providers: [OrganizationUserService],
})
export class OrganizationUserModule {}
