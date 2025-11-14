import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class StockFilterDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
