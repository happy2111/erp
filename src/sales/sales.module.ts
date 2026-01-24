import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { KassasModule } from '../kassas/kassas.module';
import { PaymentsModule } from '../payments/payments.module';
import { InstallmentsModule } from '../installments/installments.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    KassasModule,
    PaymentsModule,
    InstallmentsModule,
    TransactionsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
