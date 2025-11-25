import { Module } from '@nestjs/common';
import { MainUserRefreshTokenService } from './main-user-refresh-token.service';
import { MainUserRefreshTokenController } from './main-user-refresh-token.controller';

@Module({
  controllers: [MainUserRefreshTokenController],
  providers: [MainUserRefreshTokenService],
})
export class MainUserRefreshTokenModule {}
