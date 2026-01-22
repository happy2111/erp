import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SaleStatus } from '.prisma/client-tenant';

export class UpdateSaleDto {
  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-kassa' })
  @IsOptional()
  @IsUUID()
  kassaId?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ example: 'Обновлённые примечания' })
  @IsOptional()
  @IsString()
  notes?: string;
}
