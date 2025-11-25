import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class RefreshTokenFilterDto {
  @ApiPropertyOptional({ description: 'Поиск по tokenHash (частичное совпадение)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Фильтр по userId' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Токены, срок которых истёк до этой даты' })
  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  expiresBefore?: Date;

  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit: number = 20;
}
