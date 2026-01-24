import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { SaleStatus } from '.prisma/client-tenant';
import { DateRangeFilterDto } from './report-common.dto';

export class SalesReportFilterDto extends DateRangeFilterDto {
  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiPropertyOptional({ example: 'uuid-responsible' })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}
