import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'b123c456-d789-4ef0-9123-4567abcde890' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'd3b6a4f1-90c7-4e1e-9d8e-64f3b1a0a2d3' })
  @IsUUID()
  categoryId: string;
}
