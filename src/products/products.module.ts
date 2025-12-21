import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductImageModule } from './product-image/product-image.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [ProductImageModule],
})
export class ProductsModule {}
