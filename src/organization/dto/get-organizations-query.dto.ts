import { IsIn, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Expose } from 'class-transformer';

export class GetOrganizationsQueryDto {
  @IsOptional()
  @IsString()
  @Expose()
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Expose()
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsIn(['name', 'email', 'phone', 'createdAt'])
  @Expose()
  sortField?: 'name' | 'email' | 'phone' | 'createdAt' = 'createdAt';

  @IsOptional()
  // Важно: Трансформируем строку из URL в число
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Expose()
  page?: number = 1;

  @IsOptional()
  // Важно: Трансформируем строку из URL в число
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @Expose()
  limit?: number = 10;
}
