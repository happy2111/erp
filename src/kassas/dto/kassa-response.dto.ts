import { ApiProperty } from '@nestjs/swagger';
import { KassaType } from './create-kassa.dto';

export class KassaResponseDto {
  @ApiProperty({ example: 'uuid-kassa' })
  id: string;

  @ApiProperty({ example: 'Наличные UZS' })
  name: string;

  @ApiProperty({ enum: KassaType, example: KassaType.CASH })
  type: KassaType;

  @ApiProperty({ example: 'uuid-currency' })
  currencyId: string;

  @ApiProperty({ example: 1250000.5, description: 'Текущий баланс' })
  balance: number;

  @ApiProperty({ example: '2025-11-10T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-11-10T14:30:00Z' })
  updatedAt: Date;
}
