import { Injectable, NotFoundException } from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';

@Injectable()
export class ProductVariantImagesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly s3Service: S3Service,
  ) {}

  async getUploadUrl(
    tenant: Tenant,
    variantId: string,
    filename: string,
    isPrimary = false,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Вариант товара не найден');

    const key = `product-variants/${variantId}/${Date.now()}-${filename}`;

    const { url } = await this.s3Service.getUploadUrl({
      key,
      contentType: 'application/octet-stream',
    });

    if (isPrimary) {
      await client.productImage.updateMany({
        where: { productVariantId: variantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const image = await client.productImage.create({
      data: {
        productVariantId: variantId,
        key,
        isPrimary,
      },
    });

    return {
      imageId: image.id,
      uploadUrl: url,
      key,
    };
  }

  async removeImage(tenant: Tenant, imageId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const image = await client.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Изображение не найдено');

    await this.s3Service.deleteByKey(image.key);

    const deletedImage = await client.productImage.delete({
      where: { id: imageId },
    });

    if (image.isPrimary && image.productVariantId) {
      const another = await client.productImage.findFirst({
        where: { productVariantId: image.productVariantId },
        orderBy: { createdAt: 'asc' },
      });
      if (another) {
        await client.productImage.update({
          where: { id: another.id },
          data: { isPrimary: true },
        });
      }
    }

    return deletedImage;
  }

  async listImages(tenant: Tenant, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const images = await client.productImage.findMany({
      where: { productVariantId: variantId },
      orderBy: { isPrimary: 'desc' },
      select: { id: true, key: true, isPrimary: true },
    });

    return Promise.all(
      images.map(async (img) => ({
        ...img,
        url: await this.s3Service.getDownloadUrl(img.key, 3600),
      })),
    );
  }
}
