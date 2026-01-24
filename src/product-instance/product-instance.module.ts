import { Module } from '@nestjs/common';
import { ProductInstanceService } from './product-instance.service';
import { ProductInstanceController } from './product-instance.controller';
import {
  ProductTransactionsModule
} from '../product-transactions/product-transactions.module';

@Module({
  imports: [ProductTransactionsModule],
  controllers: [ProductInstanceController],
  providers: [ProductInstanceService],
  exports: [ProductInstanceService],
})
export class ProductInstanceModule {}
