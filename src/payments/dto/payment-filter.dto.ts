import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentType } from 'node_modules/.prisma/client-tenant';

export class PaymentFilterDto {
  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional({ example: 'uuid-kassa' })
  @IsOptional()
  @IsString()
  kassaId?: string;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  toDate?: string;

  page?: number = 1;
  limit?: number = 20;
}
