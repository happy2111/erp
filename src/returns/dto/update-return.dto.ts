import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReturnStatus } from '../types/returns.type';

export class UpdateReturnDto {
  @ApiPropertyOptional({ enum: ReturnStatus })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ example: 'Одобрено после проверки' })
  @IsOptional()
  @IsString()
  notes?: string;
}
