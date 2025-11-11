import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class CreateBrandDto {
  @ApiProperty({example: 'Apple', description: 'Name of the brand'})
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
