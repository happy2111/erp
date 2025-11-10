import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class OrganizationCustomerFilterDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  page: number = 1;

  @ApiProperty({ example: 10 })
  @IsNumber()
  limit: number = 10;

  @ApiProperty({ example: 'ASC', enum: SortOrder, required: false })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({ example: 'firstName', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'; // упрощённая версия

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isBlacklisted?: boolean;

  @ApiProperty({ example: 'b24c7d4a-1e2b-43a7-9c8b-...', required: false })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
