import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly s3Service: S3Service,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ============================================================
  // ГЕНЕРАЦИЯ PRESIGNED URL ДЛЯ ЗАГРУЗКИ ДОКУМЕНТА
  // ============================================================
  // documents/documents.service.ts
  async getUploadUrl(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateDocumentDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем связи
    if (dto.saleId) {
      const sale = await client.sale.findFirst({
        where: { id: dto.saleId, organizationId },
      });
      if (!sale)
        throw new NotFoundException(
          'Продажа не найдена или принадлежит другой организации',
        );
    }

    if (dto.customerId) {
      const customer = await client.organizationCustomer.findFirst({
        where: { id: dto.customerId, organizationId },
      });
      if (!customer)
        throw new NotFoundException(
          'Клиент не найден или принадлежит другой организации',
        );
    }

    // 2. Определяем entityType и entityId для структуры ключа
    let entityType = 'other';
    let entityId = 'misc';

    if (dto.saleId) {
      entityType = 'sale';
      entityId = dto.saleId;
    } else if (dto.customerId) {
      entityType = 'customer';
      entityId = dto.customerId;
    }

    // 3. Генерируем уникальный ключ в S3
    const timestamp = Date.now();
    const key = `documents/${organizationId}/${entityType}/${entityId}/${timestamp}-${dto.filename}`;

    // 4. Генерируем presigned PUT URL
    const { url } = await this.s3Service.getUploadUrl({
      key,
      contentType: 'application/octet-stream',
      expiresIn: 3600, // 1 час
    });

    const document = await client.$transaction(async (tx) => {
      const newDoc = await tx.document.create({
        data: {
          organizationId,
          customerId: dto.customerId,
          saleId: dto.saleId,
          type: dto.type,
          key,
          filename: dto.filename,
          uploadedById: user.orgUserId,
        },
      });

      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Document',
        entityId: document.id,
        newValue: {
          type: dto.type,
          filename: dto.filename,
          key,
          saleId: dto.saleId,
          customerId: dto.customerId,
        },
        note: `Загружен документ "${dto.filename}" типа ${dto.type}`,
      });

      return newDoc;
    });

    return {
      documentId: document.id,
      uploadUrl: url,
      key,
      filename: dto.filename,
    };
  }
  // ============================================================
  // СПИСОК ДОКУМЕНТОВ (с фильтрами + signed GET URL)
  // ============================================================
  async listDocuments(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: DocumentFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      type,
      saleId,
      customerId,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.DocumentWhereInput = { organizationId };

    if (type) where.type = type;
    if (saleId) where.saleId = saleId;
    if (customerId) where.customerId = customerId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { email: true } },
          sale: { select: { invoiceNumber: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      client.document.count({ where }),
    ]);

    // Генерируем signed URL для каждого документа
    const transformed = await Promise.all(
      data.map(async (doc) => {
        const downloadUrl = await this.s3Service.getDownloadUrl(doc.key, 3600); // 1 час
        return {
          ...doc,
          downloadUrl, // временный signed URL
        };
      }),
    );

    return {
      data: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // ПОЛУЧЕНИЕ SIGNED URL ДЛЯ СКАЧИВАНИЯ ДОКУМЕНТА
  // ============================================================
  async getDownloadUrl(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    expiresIn = 3600,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const document = await client.document.findFirst({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException(
        'Документ не найден или принадлежит другой организации',
      );
    }

    const url = await this.s3Service.getDownloadUrl(document.key, expiresIn);

    // Логируем скачивание
    await client.$transaction(async (tx) => {
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'DOWNLOAD',
        entity: 'Document',
        entityId: id,
        note: `Скачан документ "${document.type}" (key: ${document.key})`,
      });
    });

    return { url };
  }

  // ============================================================
  // УДАЛЕНИЕ ДОКУМЕНТА
  // ============================================================
  async remove(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const document = await client.document.findFirst({
      where: { id, organizationId },
    });

    if (!document) {
      throw new NotFoundException(
        'Документ не найден или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      // Удаляем из S3
      await this.s3Service.deleteByKey(document.key);

      // Удаляем из БД
      const deleted = await tx.document.delete({ where: { id } });

      // Логируем удаление
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Document',
        entityId: id,
        oldValue: {
          type: document.type,
          key: document.key,
        },
        note: `Удалён документ "${document.type}" (key: ${document.key})`,
      });

      return deleted;
    });
  }
}
