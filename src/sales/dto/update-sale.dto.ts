import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SaleStatus } from '.prisma/client-tenant';

export class UpdateSaleDto {
  @ApiPropertyOptional({
    description: 'ID клиента, если нужно изменить клиента',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Статус продажи',
    enum: ['DRAFT', 'PENDING', 'PAID', 'CANCELLED'],
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ description: 'Примечания к продаже' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID кассы, если нужно изменить кассу' })
  @IsOptional()
  @IsUUID()
  kassaId?: string;
}
