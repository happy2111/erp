import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class MarkLostDto {
  @ApiProperty({ example: 'uuid-product-instance' })
  @IsUUID()
  instanceId: string;

  @ApiPropertyOptional({ example: 'Утерян при транспортировке' })
  @IsOptional()
  @IsString()
  description?: string;
}
