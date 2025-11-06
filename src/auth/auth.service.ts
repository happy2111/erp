import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });

    if (!user) throw new NotFoundException('User not found');

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    // Генерация токенов
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '7d' },
    );

    // Сохраняем refresh токен в отдельной таблице
    const hashedRt = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.userRefreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRt,
        expiresAt,
      },
    });

    // Отправляем refresh токен через cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token: accessToken, user };
  }

  async refresh(userId: string, refreshToken: string, res: Response) {
    const tokens = await this.prisma.userRefreshToken.findMany({ where: { userId } });

    if (!tokens.length) throw new ForbiddenException('No active sessions');

    // Находим валидный refresh token
    const validToken = await Promise.any(
      tokens.map(async (t) => {
        const match = await bcrypt.compare(refreshToken, t.tokenHash);
        if (match && t.expiresAt > new Date()) return t;
        return null;
      }),
    ).catch(() => null);

    if (!validToken) throw new ForbiddenException('Invalid or expired refresh token');

    // Генерация новых токенов
    const newAccess = this.jwtService.sign(
      { sub: userId },
      { expiresIn: '15m' },
    );

    const newRefresh = this.jwtService.sign({ sub: userId }, { expiresIn: '7d' });
    const newHash = await bcrypt.hash(newRefresh, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Обновляем старую запись refresh токена
    await this.prisma.userRefreshToken.update({
      where: { id: validToken.id },
      data: { tokenHash: newHash, expiresAt },
    });

    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token: newAccess };
  }

  async logout(userId: string, refreshToken: string, res: Response) {
    const tokens = await this.prisma.userRefreshToken.findMany({ where: { userId } });

    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        await this.prisma.userRefreshToken.delete({ where: { id: t.id } });
        break;
      }
    }

    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });

    if (existing) throw new ConflictException('User already exists');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        password: hashed,
      },
    });

    return user;
  }
}
