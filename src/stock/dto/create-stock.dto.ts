import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class CreateStockDto {
  @ApiProperty({ example: 'uuid-org', description: 'ID организации' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 'uuid-product', description: 'ID товара' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 150, description: 'Количество продукта на складе' })
  @IsInt()
  @Min(0)
  quantity: number;
}
