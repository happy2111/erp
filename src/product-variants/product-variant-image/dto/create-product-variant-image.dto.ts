import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductVariantImageDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPrimary?: boolean;
}
