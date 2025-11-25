import { Controller } from '@nestjs/common';
import { ProductInstanceService } from './product-instance.service';

@Controller('product-instance')
export class ProductInstanceController {
  constructor(private readonly productInstanceService: ProductInstanceService) {}
}
