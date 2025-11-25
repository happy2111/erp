import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductTransactionDto } from './dto/create-product-transaction.dto';

@Injectable()
export class ProductTransactionService {

  /**
   * Создать транзакцию товара
   */
  async create(client: any, dto: CreateProductTransactionDto) {
    // Проверка, что instance существует
    const instance = await client.productInstance.findUnique({
      where: { id: dto.productInstanceId },
    });

    if (!instance) {
      throw new NotFoundException('ProductInstance not found');
    }

    return client.productTransaction.create({
      data: {
        productInstanceId: dto.productInstanceId,
        fromCustomerId: dto.fromCustomerId ?? null,
        toCustomerId: dto.toCustomerId ?? null,
        toOrganizationId: dto.toOrganizationId ?? null,
        saleId: dto.saleId ?? null,
        action: dto.action,
        description: dto.description ?? null,
      },
    });
  }

  /**
   * Получить все транзакции
   */
  async findAll(client: any,query: any) {
    return client.productTransaction.findMany({
      where: {
        productInstanceId: query.productInstanceId,
        action: query.action,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * История по instance
   */
  async getHistory(client: any,productInstanceId: string) {
    const exists = await client.productInstance.findUnique({
      where: { id: productInstanceId },
    });

    if (!exists) {
      throw new NotFoundException('ProductInstance not found');
    }

    return client.productTransaction.findMany({
      where: { productInstanceId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Получить одну транзакцию
   */
  async findOne(client: any, id: string) {
    const trx = await client.productTransaction.findUnique({
      where: { id },
    });

    if (!trx) {
      throw new NotFoundException('Transaction not found');
    }

    return trx;
  }

  /**
   * Удалить транзакцию (используется редко)
   */
  async remove(client: any, id: string) {
    return client.productTransaction.delete({
      where: { id },
    });
  }
}
