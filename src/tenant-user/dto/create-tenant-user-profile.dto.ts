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

  @IsString()
  @IsOptional()
  passportSeries?: string;

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @IsOptional()
  issuedBy?: string;

  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  issuedDate?: Date;

  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  expiryDate?: Date;

  @ApiProperty({ example: 'Узбекистан', required: false })
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: "Propiska addressi",
    example: "123 Main St, Anytown, Uzbekistan",
    required: false
  })
  @IsString()
  @IsOptional()
  registration?: string;

  @ApiProperty({
    description: "Hudud, Rayon",
    example: "Мирзо-Улугбекский район",
    required: false
  })
  @IsString()
  @IsOptional()
  district?: string;

}
