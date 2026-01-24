import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class TransferInstanceDto {
  @ApiProperty({ example: 'uuid-product-instance' })
  @IsUUID()
  instanceId: string;

  @ApiProperty({ example: 'uuid-organization' })
  @IsUUID()
  toOrganizationId: string;

  @ApiPropertyOptional({ example: 'Передача между филиалами' })
  @IsOptional()
  @IsString()
  description?: string;
}
