import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { StocksModule } from '../stocks/stocks.module';
import { KassasModule } from '../kassas/kassas.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [StocksModule, KassasModule, TransactionsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
