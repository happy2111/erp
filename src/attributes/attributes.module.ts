import { Module } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { AttributeService } from './attribute/attribute.service';
import { AttributeController } from './attribute/attribute.controller';
import { AttributeValueService } from './attribute-value/attribute-value.service';
import { AttributeValueController } from './attribute-value/attribute-value.controller';
import { ProductVariantAttributeService } from './product-variant-attribute/product-variant-attribute.service';
import { ProductVariantAttributeController } from './product-variant-attribute/product-variant-attribute.controller';
import { ProductInstanceController } from '../product-instance/product-instance.controller';
import { ProductInstanceService } from '../product-instance/product-instance.service';
import { ProductInstanceAttributeController } from './product-instance-attribute/product-instance-attribute.controller';
import { ProductInstanceAttributeService } from './product-instance-attribute/product-instance-attribute.service';

@Module({
  controllers: [
    AttributeController,
    AttributeValueController,
    ProductVariantAttributeController,
    // ProductInstanceAttributeController,
  ],
  providers: [
    PrismaTenantService,
    AttributeService,
    AttributeValueService,
    ProductVariantAttributeService,
    // ProductInstanceAttributeService,
  ],
})
export class AttributesModule {}
