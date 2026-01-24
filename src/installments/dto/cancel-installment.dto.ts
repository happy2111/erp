import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelInstallmentDto {
  @ApiPropertyOptional({ example: 'Клиент отказался от покупки' })
  @IsOptional()
  @IsString()
  reason?: string;
}
