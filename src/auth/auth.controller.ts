import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  Req,
  ForbiddenException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from '@prisma/client';
import type { Response, Request } from 'express';

@Controller('auth')
class AuthController {
  constructor(private readonly authService: AuthService) {}

  // { passthrough: true } — позволяет Nest автоматически вернуть объект как JSON, но при этом ты можешь устанавливать cookie внутри сервиса.
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }


  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies['refresh_token'];
    if (!token) throw new ForbiddenException('No refresh token');

    // Расшифровываем токен, получаем userId
    const payload = await this.authService['jwtService'].verifyAsync(token);
    return this.authService.refresh(payload.sub, token, res);
  }

}

export default AuthController
