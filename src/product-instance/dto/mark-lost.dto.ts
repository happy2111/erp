import {IsNotEmpty, IsOptional, IsString, IsUUID} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class MarkLostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  instanceId: string;
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  description?: string | null;
}