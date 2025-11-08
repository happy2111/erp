import {IsOptional, IsString, IsUUID, MaxLength} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class CreateTenantDto {
  @ApiProperty({example: 'Acme Inc.'})
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({description: 'Owner ID', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', required: false})
  @IsUUID()
  @IsOptional()
  ownerId?: string; // id пользователя main_db (можно потом расширить)

  @ApiProperty({example: 'acme.uz', required: false})
  @IsString()
  @IsOptional()
  hostname?: string;
}
