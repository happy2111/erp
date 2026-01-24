import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsUUID } from 'class-validator';
import { DateRangeFilterDto } from './report-common.dto';

export class StockReportFilterDto extends DateRangeFilterDto {
  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiPropertyOptional({ description: 'Минимальный остаток для показа' })
  @IsOptional()
  @IsNumberString()
  minQuantity?: string;

  @ApiPropertyOptional({ description: 'Максимальный остаток для показа' })
  @IsOptional()
  @IsNumberString()
  maxQuantity?: string;
}
