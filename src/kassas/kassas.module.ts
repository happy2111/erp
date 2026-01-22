import { Module } from '@nestjs/common';
import { KassasService } from './kassas.service';
import { KassasController } from './kassas.controller';

@Module({
  controllers: [KassasController],
  providers: [KassasService],
  exports: [KassasService],
})
export class KassasModule {}
