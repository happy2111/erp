import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SellInstanceDto {
  @ApiProperty({ example: 'uuid-product-instance' })
  @IsUUID()
  instanceId: string;

  @ApiProperty({ example: 'uuid-customer' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ example: 'uuid-sale' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({ example: 'Продажа по чеку №123' })
  @IsOptional()
  @IsString()
  description?: string;
}
