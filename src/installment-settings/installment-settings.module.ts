import { Module } from '@nestjs/common';
import { InstallmentSettingsService } from './installment-settings.service';
import { InstallmentSettingsController } from './installment-settings.controller';

@Module({
  controllers: [InstallmentSettingsController],
  providers: [InstallmentSettingsService],
})
export class InstallmentSettingsModule {}
