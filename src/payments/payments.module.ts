import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { KassasModule } from '../kassas/kassas.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [KassasModule, TransactionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
