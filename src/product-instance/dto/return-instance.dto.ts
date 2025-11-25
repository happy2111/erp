import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnInstanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  instanceId: string;

  // ---

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  fromCustomerId?: string | null;

  // ---

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  toOrganizationId?: string | null;

  // ---

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Type(() => String)
  description?: string | null;
}