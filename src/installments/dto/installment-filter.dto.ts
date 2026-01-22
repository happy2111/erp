import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InstallmentStatus } from '.prisma/client-tenant';

export class InstallmentFilterDto {
  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: InstallmentStatus })
  @IsOptional()
  @IsEnum(InstallmentStatus)
  status?: InstallmentStatus;

  @ApiPropertyOptional({ example: 'OVERDUE' })
  @IsOptional()
  @IsString()
  overdue?: 'true' | 'false';

  page?: number = 1;
  limit?: number = 20;
}
