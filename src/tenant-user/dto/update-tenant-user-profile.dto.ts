import { IsISO8601, IsIn, IsOptional, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";
import {} from "@prisma/client";

export const GenderValues = ['MALE', 'FEMALE', 'OTHER'] as const;
export type GenderDto = typeof GenderValues[number];

export class UpdateTenantUserProfileDto {
  @ApiProperty({ example: 'Мухаммад Юсуф', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Абдурахимов', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'Юсуфович', required: false })
  @IsString()
  @IsOptional()
  patronymic?: string;

  @ApiProperty({ example: '2003-05-14T00:00:00Z', required: false })
  @IsISO8601()
  @IsOptional()
  dateOfBirth?: string; // ISO-строка

  @ApiProperty({ example: 'MALE', required: false, enum: GenderValues })
  @IsIn(GenderValues)
  @IsOptional()
  gender?: GenderDto;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  passportSeries?: string;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  passportNumber?: string;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  issuedBy?: string;

  @ApiProperty({required: false })
  @IsISO8601()
  @IsOptional()
  issuedDate?: string;

  @ApiProperty({required: false })
  @IsISO8601()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({required: false })
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

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  district?: string;
}