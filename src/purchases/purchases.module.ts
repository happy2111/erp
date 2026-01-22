import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { StocksModule } from '../stocks/stocks.module';
import { KassasModule } from '../kassas/kassas.module';

@Module({
  imports: [StocksModule, KassasModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
