import { Module } from '@nestjs/common';
import { KassaTransfersService } from './kassa-transfers.service';
import { KassaTransfersController } from './kassa-transfers.controller';
import { KassasModule } from '../kassas/kassas.module';

@Module({
  imports: [KassasModule],
  controllers: [KassaTransfersController],
  providers: [KassaTransfersService],
})
export class KassaTransfersModule {}
