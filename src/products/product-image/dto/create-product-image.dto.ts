import { IsOptional, IsBoolean } from 'class-validator';

export class CreateProductImageDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
