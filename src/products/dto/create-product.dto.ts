import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro', description: 'Название товара' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Смартфон с 256 ГБ памяти',
    description: 'Описание товара',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-brand', description: 'ID бренда', required: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ example: 'uuid-org', description: 'ID организации' })
  @IsString()
  organizationId: string;
}
