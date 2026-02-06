import { Module } from '@nestjs/common';
import { ProductTransactionsService } from './product-transactions.service';
import { ProductTransactionsController } from './product-transactions.controller';

@Module({
  controllers: [ProductTransactionsController],
  providers: [ProductTransactionsService],
  exports: [ProductTransactionsService],
})
export class ProductTransactionsModule {}



