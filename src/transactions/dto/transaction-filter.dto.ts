// transactions/dto/transaction-filter.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RelatedType } from '.prisma/client-tenant';

export class TransactionFilterDto {
  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: RelatedType })
  @IsOptional()
  @IsEnum(RelatedType)
  relatedType?: RelatedType;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  toDate?: string;

  page?: number = 1;
  limit?: number = 20;
}
