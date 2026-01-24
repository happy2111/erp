import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ResellInstanceDto {
  @ApiProperty({ example: 'uuid-product-instance' })
  @IsUUID()
  instanceId: string;

  @ApiProperty({ example: 'uuid-new-customer' })
  @IsUUID()
  newCustomerId: string;

  @ApiPropertyOptional({ example: 'uuid-new-sale' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({ example: 'Перепродажа после ремонта' })
  @IsOptional()
  @IsString()
  description?: string;
}
