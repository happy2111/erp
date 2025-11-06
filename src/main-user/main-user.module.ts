import { Module } from '@nestjs/common';
import { MainUserService } from './main-user.service';
import { MainUserController } from './main-user.controller';

@Module({
  controllers: [MainUserController],
  providers: [MainUserService],
})
export class MainUserModule {}
