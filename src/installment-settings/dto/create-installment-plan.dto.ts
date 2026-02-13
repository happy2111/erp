import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInstallmentPlanDto {
  @ApiProperty({ example: 6, description: 'Срок в месяцах' })
  @IsInt()
  @IsNotEmpty()
  months: number;

  @ApiProperty({ example: '1.15', description: 'Коэффициент наценки' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  coefficient: number;
}
