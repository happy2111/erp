import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MainUserRefreshTokenService } from './main-user-refresh-token.service';
import { RefreshTokenFilterDto } from './dto/refresh-token-filter.dto';
import { DeleteManyRefreshTokensDto } from './dto/delete-many-refresh-tokens.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@ApiTags('Main User Refresh Tokens')
@Controller('main-user-refresh-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER, UserRole.OWNER)
export class MainUserRefreshTokenController {
  constructor(
    private readonly mainUserRefreshTokenService: MainUserRefreshTokenService,
  ) {}

  @Get('filter')
  @ApiOperation({ summary: 'Получить список refresh токенов с фильтрами' })
  async findAll(@Query() query: RefreshTokenFilterDto) {
    return this.mainUserRefreshTokenService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить один refresh токен по ID' })
  async findOne(@Param('id') id: string) {
    return this.mainUserRefreshTokenService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить один refresh токен по ID' })
  async delete(@Param('id') id: string) {
    return this.mainUserRefreshTokenService.delete(id);
  }

  // Массовое удаление: поддерживает body = { ids: [...] } и body = { data: { ids: [...] } }
  @Post('bulk')
  @ApiOperation({ summary: 'Массовое удаление refresh токенов' })
  @ApiBody({ type: DeleteManyRefreshTokensDto })
  async deleteMany(@Body() body: any) {
    // нормализация: если клиент прислал обёртку `data`, используем её
    const payload = body?.data ?? body;

    // трансформируем и валидируем DTO вручную, чтобы сохранить гибкость формата входа
    const dto = plainToInstance(DeleteManyRefreshTokensDto, payload);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const messages = errors.flatMap((err) =>
        Object.values(err.constraints || {}),
      );
      throw new BadRequestException({
        message: messages,
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    return this.mainUserRefreshTokenService.deleteMany(dto);
  }

  @Delete('user/:userId')
  @ApiOperation({
    summary: 'Удалить все refresh токены конкретного пользователя',
  })
  async deleteAllForUser(@Param('userId') userId: string) {
    return this.mainUserRefreshTokenService.deleteAllForUser(userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Удалить все просроченные refresh токены',
  })
  async purgeExpired() {
    return this.mainUserRefreshTokenService.purgeExpired();
  }
}
