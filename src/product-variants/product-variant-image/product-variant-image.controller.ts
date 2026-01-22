import {
  Controller,
  Post,
  UseGuards,
  Param,
  Delete,
  Get,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ProductVariantImagesService } from './product-variant-image.service';
import { ApiTags, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { OrgUserRole } from '.prisma/client-tenant';
import type { Tenant } from '@prisma/client';
import { CreateProductVariantImageDto } from './dto/create-product-variant-image.dto';
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';

@ApiTags('Product Variant Images')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('product-variants/images')
export class ProductVariantImagesController {
  constructor(private readonly imagesService: ProductVariantImagesService) {}

  @Post(':variantId/presign')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({
    summary: 'Получить presigned URL для загрузки изображения варианта',
  })
  @ApiParam({ name: 'variantId', description: 'ID варианта продукта' })
  getPresignUrl(
    @CurrentTenant() tenant: Tenant,
    @Param('variantId') variantId: string,
    @Body() dto: CreateProductVariantImageDto & { filename: string },
  ) {
    if (!dto.filename) {
      throw new BadRequestException('Не указан filename');
    }

    return this.imagesService.getUploadUrl(
      tenant,
      variantId,
      dto.filename,
      dto.isPrimary,
    );
  }

  @Get(':variantId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список изображений варианта продукта' })
  @ApiParam({ name: 'variantId', description: 'ID варианта продукта' })
  list(@CurrentTenant() tenant: Tenant, @Param('variantId') variantId: string) {
    return this.imagesService.listImages(tenant, variantId);
  }

  @Delete(':imageId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить изображение варианта продукта' })
  @ApiParam({ name: 'imageId', description: 'ID изображения' })
  remove(@CurrentTenant() tenant: Tenant, @Param('imageId') imageId: string) {
    return this.imagesService.removeImage(tenant, imageId);
  }
}
