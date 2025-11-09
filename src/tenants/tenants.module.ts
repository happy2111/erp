import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import {OrganizationModule} from "../organization/organization.module";
import {
  OrganizationUserModule
} from "../organization-user/organization-user.module";

@Module({
  imports: [OrganizationModule, OrganizationUserModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
