import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenFilterDto } from './dto/refresh-token-filter.dto';
import {DeleteManyRefreshTokensDto} from "./dto/delete-many-refresh-tokens.dto";

@Injectable()
export class MainUserRefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}


  /**
   * Получить список refresh токенов с фильтрами
   */
  async findAll(query: RefreshTokenFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.expiresBefore) {
      where.expiresAt = { lt: query.expiresBefore };
    }

    if (query.search) {
      where.tokenHash = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.userRefreshToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userRefreshToken.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    };
  }


  /**
   * Получить один токен
   */
  async findOne(id: string) {
    const token = await this.prisma.userRefreshToken.findUnique({
      where: { id },
    });

    if (!token) throw new NotFoundException('Refresh token not found');

    return token;
  }

  /**
   * Удалить один refresh токен
   */
  async delete(id: string) {
    return this.prisma.userRefreshToken.delete({
      where: { id },
    });
  }

  /**
   * Удалить сразу много токенов (по userId или истёкшим)
   */
  async deleteMany(dto: DeleteManyRefreshTokensDto) {
    const { ids } = dto;

    const result = await this.prisma.userRefreshToken.deleteMany({
      where: { id: { in: ids } },
    });

    return {
      success: true,
      statusCode: 200,
      message: `Deleted ${result.count} refresh token(s)`,
      deleted: result.count,
    };
  }

  /**
   * Удалить все токены пользователя
   */
  async deleteAllForUser(userId: string) {
    return this.prisma.userRefreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Удалить все просроченные токены
   */
  async purgeExpired() {
    return this.prisma.userRefreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
