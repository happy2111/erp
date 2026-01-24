import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '.prisma/client-tenant';

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.CONTRACT })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ example: 'uuid-sale' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ example: 'invoice.pdf' })
  @IsString()
  filename: string;
}
