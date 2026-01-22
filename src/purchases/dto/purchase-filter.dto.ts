import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseStatus } from '.prisma/client-tenant';

export class PurchaseFilterDto {
  @ApiPropertyOptional({ example: 'INV-2025' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({ example: 'uuid-supplier' })
  @IsOptional()
  supplierId?: string;

  page?: number = 1;
  limit?: number = 20;
}
