import { Controller } from '@nestjs/common';
import { ProductTransactionService } from './product-transaction.service';

@Controller('product-transaction')
export class ProductTransactionController {
  constructor(private readonly productTransactionService: ProductTransactionService) {}
}
