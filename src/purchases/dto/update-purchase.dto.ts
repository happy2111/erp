import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PurchaseStatus } from '.prisma/client-tenant';

export class UpdatePurchaseDto {
  @ApiPropertyOptional({ example: 'uuid-supplier' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'uuid-kassa' })
  @IsOptional()
  @IsUUID()
  kassaId?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({ example: 'Обновлённые примечания' })
  @IsOptional()
  @IsString()
  notes?: string;
}
