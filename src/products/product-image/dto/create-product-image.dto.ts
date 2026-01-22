import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductImageDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPrimary?: boolean;
}
