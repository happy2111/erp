import { Module } from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { StocksModule } from '../stocks/stocks.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProductTransactionsModule } from '../product-transactions/product-transactions.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    ProductTransactionsModule,
    StocksModule,
    AuditLogsModule,
    TransactionsModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
