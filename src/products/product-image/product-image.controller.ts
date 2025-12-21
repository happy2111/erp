import {
  Controller,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Param,
  Delete,
  Get,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImagesService } from './product-image.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { OrgUserRole } from '.prisma/client-tenant';
import type { Tenant } from '@prisma/client';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';

@ApiTags('Product Images')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('products/images')
export class ProductImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  @Post(':productId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить изображение товара' })
  @ApiParam({ name: 'productId', description: 'ID товара' })
  upload(
    @CurrentTenant() tenant: Tenant,
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.imagesService.uploadProductImage(
      tenant,
      productId,
      file,
      dto.isPrimary,
    );
  }

  @Get(':productId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список изображений товара' })
  @ApiParam({ name: 'productId', description: 'ID товара' })
  list(@CurrentTenant() tenant: Tenant, @Param('productId') productId: string) {
    return this.imagesService.listProductImages(tenant, productId);
  }

  @Delete(':imageId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить изображение товара' })
  @ApiParam({ name: 'imageId', description: 'ID изображения' })
  remove(@CurrentTenant() tenant: Tenant, @Param('imageId') imageId: string) {
    return this.imagesService.removeProductImage(tenant, imageId);
  }
}
