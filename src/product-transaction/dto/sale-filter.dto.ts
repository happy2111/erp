import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SaleStatus } from '.prisma/client-tenant';

export class SaleFilterDto {
  @ApiPropertyOptional({ example: 'INV-2025' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  limit?: number = 20;
}
