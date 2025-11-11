import { IsOptional, IsString, MaxLength } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class UpdateBrandDto {
  @ApiProperty({example: 'Apple', description: 'Name of the brand', required: false})
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
