import { Module } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { InstallmentsController } from './installments.controller';
import { PaymentsModule } from '../payments/payments.module';
import { KassasModule } from '../kassas/kassas.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [PaymentsModule, KassasModule, TransactionsModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService]
})
export class InstallmentsModule {}
