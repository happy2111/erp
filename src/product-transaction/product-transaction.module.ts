import {Global, Module} from '@nestjs/common';
import { ProductTransactionService } from './product-transaction.service';
import { ProductTransactionController } from './product-transaction.controller';

@Global()
@Module({
  controllers: [ProductTransactionController],
  providers: [ProductTransactionService],
  exports: [ProductTransactionService],
})
export class ProductTransactionModule {}
