import { Module } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { AttributeService } from './attribute/attribute.service';
import { AttributeController } from './attribute/attribute.controller';
import { AttributeValueService } from './attribute-value/attribute-value.service';
import { AttributeValueController } from './attribute-value/attribute-value.controller';
import { ProductVariantAttributeService } from './product-variant-attribute/product-variant-attribute.service';
import { ProductVariantAttributeController } from './product-variant-attribute/product-variant-attribute.controller';

@Module({
  controllers: [
    AttributeController,
    AttributeValueController,
    ProductVariantAttributeController,
  ],
  providers: [
    PrismaTenantService,
    AttributeService,
    AttributeValueService,
    ProductVariantAttributeService,
  ],
})
export class AttributesModule {}
