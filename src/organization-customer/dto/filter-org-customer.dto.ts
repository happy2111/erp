import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class OrganizationCustomerFilterDto {
  @ApiProperty({ example: 1, description: 'Номер страницы' })
  @Type(() => Number) // Преобразует строку в число
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({ example: 10, description: 'Количество записей' })
  @Type(() => Number) // Преобразует строку в число
  @IsNumber()
  @Min(1)
  limit: number = 10;

  @ApiProperty({ example: SortOrder.ASC, enum: SortOrder, required: false })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({ example: 'firstName', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: true, required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isBlacklisted?: boolean;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
