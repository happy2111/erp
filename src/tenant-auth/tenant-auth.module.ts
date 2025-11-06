import { Module } from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';
import { TenantAuthController } from './tenant-auth.controller';
import {JwtModule} from "@nestjs/jwt";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {getJwtConfig} from "../config/tenant-jwt.config";
import {JwtStrategy} from "./strategies/jwt.strategy";
import {JwtAuthGuard} from "./guards/jwt.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: getJwtConfig,
      inject: [ConfigService]
    })
  ],
  controllers: [TenantAuthController],
  providers: [TenantAuthService, JwtStrategy, JwtAuthGuard],
  exports: [TenantAuthService, JwtAuthGuard, JwtStrategy]
})
export class TenantAuthModule {}
