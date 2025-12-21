import { Injectable, NotFoundException } from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';


@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadProductImage(
    tenant: Tenant,
    productId: string,
    file: Express.Multer.File,
    isPrimary = false,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    const key = `products/${productId}/${Date.now()}-${file.originalname}`;

    const { url } = await this.s3Service.uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    if (isPrimary) {
      await client.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return client.productImage.create({
      data: {
        productId,
        url,
        isPrimary,
      },
    });
  }

  async removeProductImage(tenant: Tenant, imageId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const image = await client.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Изображение не найдено');

    await this.s3Service.deleteByUrl(image.url);

    return client.productImage.delete({ where: { id: imageId } });
  }

  async listProductImages(tenant: Tenant, productId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productImage.findMany({
      where: { productId },
      orderBy: { isPrimary: 'desc' },
    });
  }
}
