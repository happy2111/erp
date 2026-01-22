import { Module } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsController } from './product-variants.controller';
import {
  ProductVariantImageModule
} from './product-variant-image/product-variant-image.module';

@Module({
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
  imports: [ProductVariantImageModule],
})
export class ProductVariantsModule {}
