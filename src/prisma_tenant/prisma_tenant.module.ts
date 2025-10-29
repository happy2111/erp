import {Global, Module} from '@nestjs/common';
import { PrismaTenantService } from './prisma_tenant.service';

@Global()
@Module({
  providers: [PrismaTenantService],
  exports: [PrismaTenantService],
})
export class PrismaTenantModule {}
