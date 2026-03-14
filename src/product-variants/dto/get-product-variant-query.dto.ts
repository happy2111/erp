import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetProductVariantQueryDto {
  @ApiPropertyOptional({ example: 'iPhone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-товара' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: 'title' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: { rang: ['uuid-4', 'uuid-2'], memory: ['uuid-3'] },
    description:
      'Объект, где ключ - это key атрибута, а значение - массив ID значений (AttributeValue)',
  })
  @IsOptional()
  @ApiPropertyOptional({
    example: { color: ['uuid-1'], memory: ['uuid-2'] },
  })

  @IsOptional()
  attributes?: any;
}
