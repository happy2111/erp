import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { KassasModule } from '../kassas/kassas.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [KassasModule, PaymentsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
