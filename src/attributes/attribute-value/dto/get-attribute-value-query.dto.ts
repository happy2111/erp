import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetAttributeValueQueryDto {
  @ApiPropertyOptional({ example: 'Черный' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '7f6e5d4c-3b2a-1908-7654-3210abcdef98' })
  @IsOptional()
  @IsUUID()
  attributeId?: string;

  @ApiPropertyOptional({ example: 'value' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsString()
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
}
