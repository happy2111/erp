import { Module } from '@nestjs/common';
import { ProductInstanceService } from './product-instance.service';
import { ProductInstanceController } from './product-instance.controller';

@Module({
  controllers: [ProductInstanceController],
  providers: [ProductInstanceService],
})
export class ProductInstanceModule {}
