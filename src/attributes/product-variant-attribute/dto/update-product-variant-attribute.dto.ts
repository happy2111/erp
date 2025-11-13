import { PartialType } from '@nestjs/swagger';
import { CreateProductVariantAttributeDto } from './create-product-variant-attribute.dto';

export class UpdateProductVariantAttributeDto extends PartialType(CreateProductVariantAttributeDto) {}
