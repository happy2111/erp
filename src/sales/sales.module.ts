import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { KassasModule } from '../kassas/kassas.module';

@Module({
  imports: [KassasModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
