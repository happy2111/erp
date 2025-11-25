import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TransferInstanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  instanceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toOrganizationId: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Type(() => String)
  description?: string | null;
}