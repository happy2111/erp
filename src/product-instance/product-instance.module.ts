import { Module } from '@nestjs/common';
import { ProductInstanceService } from './product-instance.service';
import { ProductInstanceController } from './product-instance.controller';
import { ProductTransactionsService } from '../product-transactions/product-transactions.service';

@Module({
  imports: [ProductTransactionsService],
  controllers: [ProductInstanceController],
  providers: [ProductInstanceService],
  exports: [ProductInstanceService],
})
export class ProductInstanceModule {}
