import {ApiProperty} from "@nestjs/swagger";
import {IsEnum, IsOptional, IsString} from "class-validator";

export enum GenderDtoEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class CreateTenantUserProfileDto {
  @ApiProperty({ example: 'Мухаммад Юсуф' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Абдурахимов' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Юсуфович', required: false })
  @IsOptional()
  @IsString()
  patronymic?: string;

  @ApiProperty({ example: '2003-05-14T00:00:00Z', required: false })
  @IsOptional()
  dateOfBirth?: Date;

  @ApiProperty({ example: 'MALE', required: false, enum: GenderDtoEnum })
  @IsOptional()
  @IsEnum(GenderDtoEnum)
  gender?: GenderDtoEnum;


  @ApiProperty({ example: 'Узбекистан', required: false })
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Ташкент', required: false })
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  issuedDate?: Date;
  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  expiryDate?: Date;
}
