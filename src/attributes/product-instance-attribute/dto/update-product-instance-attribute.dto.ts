import { PartialType } from '@nestjs/swagger';
import { CreateProductInstanceAttributeDto } from './create-product-instance-attribute.dto';

export class UpdateProductInstanceAttributeDto extends PartialType(
  CreateProductInstanceAttributeDto,
) {}
