import { Module } from '@nestjs/common';
import {ProductPricesController} from "./product-price.controller";
import {ProductPricesService} from "./product-price.service";

@Module({
  controllers: [ProductPricesController],
  providers: [ProductPricesService],
})
export class ProductPriceModule {}
