import { CustomerType } from ".prisma/client-tenant"
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length
} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class CreateOrgCustomerDto {
  @ApiProperty({
    example: "b24c7d4a-1e2b-43a7-9c8b-.........."
  })
  @IsUUID("4")
  organizationId: string;

  @ApiProperty({
    example: "b24c7d4a-1e2b-43a7-9c8b-..........",
    required: false
  })
  @IsOptional()
  @IsUUID("4")
  userId?: string;

  @ApiProperty({example: 'John'})
  @IsString()
  @Length(1, 255, { message: 'First name must be between 1 and 255 characters' })
  firstName: string;

  @ApiProperty({example: 'Doe'})
  @IsString()
  @Length(1, 255, { message: 'First name must be between 1 and 255 characters' })
  lastName: string;

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  @Length(1, 255, { message: 'First name must be between 1 and 255 characters' })
  patronymic?: string;

  @ApiProperty({example: '+998901234567'})
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({description: 'Customer type', enum: CustomerType})
  @IsEnum(CustomerType, { message: 'Invalid type' })
  type: CustomerType;

  @ApiProperty({description: 'Is customer blacklisted', default: false})
  @IsBoolean()
  isBlacklisted: boolean;

}