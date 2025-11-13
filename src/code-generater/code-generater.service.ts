// src/code-generator/code-generator.service.ts
import { Injectable } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";


interface CodeGenerationOptions {
  /** Префикс, например, 'PRD' для продукта, 'INV' для инвойса. */
  prefix: string;
  /** Имя таблицы/модели Prisma, для которой генерируется код. */
  modelName: string;
  /** Длина порядкового номера (например, 4 => 0001, 0010) */
  sequenceLength: number;
}

@Injectable()
export class CodeGeneratorService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}
  async generateNextCode(
    tenant: Tenant,
    options: CodeGenerationOptions,
  ): Promise<string> {
    const { prefix, modelName, sequenceLength } = options;
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const clientAny: any = client;
    const model = clientAny[modelName.toLowerCase()];
    if (!model) {
      throw new Error(`Prisma model '${modelName}' not found.`);
    }

    // Запрос к БД для поиска максимального кода
    const latestRecord = await model.findFirst({
      where: {
        code: {
          startsWith: `${prefix}-`, // Фильтруем по нужному префиксу
        },
      },
      orderBy: {
        code: 'desc', // Сортируем по убыванию
      },
      select: {
        code: true,
      },
    });

    let currentSequence = 0;
    if (latestRecord && latestRecord.code) {
      // Извлекаем числовую часть из кода (например, из 'PRD-0005' получаем '5')
      const parts = latestRecord.code.split('-');
      const sequenceString = parts[parts.length - 1];
      const parsedSequence = parseInt(sequenceString, 10);

      if (!isNaN(parsedSequence)) {
        currentSequence = parsedSequence;
      }
    }

    // Инкрементируем порядковый номер
    const nextSequence = currentSequence + 1;

    // Форматируем порядковый номер с ведущими нулями (например, 1 -> '0001')
    const paddedSequence = String(nextSequence).padStart(sequenceLength, '0');

    // Формируем финальный код
    return `${prefix}-${paddedSequence}`;
  }
}