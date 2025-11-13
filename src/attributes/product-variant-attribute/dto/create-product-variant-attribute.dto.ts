import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateProductVariantAttributeDto {
  @ApiProperty({ example: '8a4b5c6d-7e8f-9012-3456-7890abcdef12', description: 'ID варианта товара' })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: '9a8b7c6d-5e4f-3a2b-1c0d-123456abcdef', description: 'ID значения атрибута' })
  @IsUUID()
  attributeValueId: string;
}
