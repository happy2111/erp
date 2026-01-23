import { Module } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { InstallmentsController } from './installments.controller';
import { PaymentsModule } from '../payments/payments.module';
import { KassasModule } from '../kassas/kassas.module';

@Module({
  imports: [PaymentsModule, KassasModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService]
})
export class InstallmentsModule {}
