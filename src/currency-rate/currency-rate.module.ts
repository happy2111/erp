import { Module } from '@nestjs/common';
import { CurrencyRateService } from './currency-rate.service';
import { CurrencyRateController } from './currency-rate.controller';

@Module({
  controllers: [CurrencyRateController],
  providers: [CurrencyRateService],
})
export class CurrencyRateModule {}
