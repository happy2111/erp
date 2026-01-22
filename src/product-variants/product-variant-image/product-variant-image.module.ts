import { Module } from '@nestjs/common';
import { ProductVariantImagesController } from './product-variant-image.controller';
import { ProductVariantImagesService } from './product-variant-image.service';

@Module({
  controllers: [ProductVariantImagesController],
  providers: [ProductVariantImagesService],
})
export class ProductVariantImageModule {}
