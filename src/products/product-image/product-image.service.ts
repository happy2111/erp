import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Генерация presigned URL для загрузки изображения товара
   */
  async getUploadUrl(
    tenant: Tenant,
    productId: string,
    filename: string,
    isPrimary = false,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Товар не найден');

    // Генерируем ключ в S3
    const key = `products/${productId}/${Date.now()}-${filename}`;

    // Генерация presigned URL
    const { url } = await this.s3Service.getUploadUrl({
      key,
      contentType: 'application/octet-stream', // фронтенд может потом подставить реальный Content-Type
    });

    // Если isPrimary, сбросить у других
    if (isPrimary) {
      await client.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Сохраняем запись в базе с ключом/URL
    const image = await client.productImage.create({
      data: {
        productId,
        url,
        isPrimary,
      },
    });

    return {
      imageId: image.id,
      uploadUrl: url, // фронтенд использует этот URL для PUT запроса
      key,
    };
  }

  /**
   * Удаление изображения
   */
  async removeProductImage(tenant: Tenant, imageId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const image = await client.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Изображение не найдено');

    await this.s3Service.deleteByUrl(image.url);

    return client.productImage.delete({ where: { id: imageId } });
  }

  /**
   * Список изображений
   */
  async listProductImages(tenant: Tenant, productId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productImage.findMany({
      where: { productId },
      orderBy: { isPrimary: 'desc' },
    });
  }
}
