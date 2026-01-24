import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ReturnInstanceDto {
  @ApiProperty({ example: 'uuid-product-instance' })
  @IsUUID()
  instanceId: string;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  fromCustomerId?: string;

  @ApiPropertyOptional({
    example: 'uuid-target-organization',
    description:
      'ID организации, куда возвращается товар (если отличается от текущей)',
  })
  @IsOptional()
  @IsUUID()
  toOrganizationId?: string;

  @ApiPropertyOptional({ example: 'Возврат по гарантии' })
  @IsOptional()
  @IsString()
  description?: string;
}
