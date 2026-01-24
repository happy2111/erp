import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InstallmentStatus } from '.prisma/client-tenant';
import { DateRangeFilterDto } from './report-common.dto';

class DebtReportFilterDto extends DateRangeFilterDto {
  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: InstallmentStatus })
  @IsOptional()
  @IsEnum(InstallmentStatus)
  status?: InstallmentStatus;
}

export default DebtReportFilterDto;
