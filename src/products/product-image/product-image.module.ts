import { Module } from '@nestjs/common';
import { ProductImagesController } from './product-image.controller';
import { ProductImagesService } from './product-image.service';

@Module({
  controllers: [ProductImagesController],
  providers: [ProductImagesService],
})
export class ProductImageModule {}
