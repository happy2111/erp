import { Module } from '@nestjs/common';
import { OrganizationCustomerService } from './organization-customer.service';
import { OrganizationCustomerController } from './organization-customer.controller';

@Module({
  controllers: [OrganizationCustomerController],
  providers: [OrganizationCustomerService],
})
export class OrganizationCustomerModule {}
