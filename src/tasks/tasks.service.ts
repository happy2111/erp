import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { InstallmentStatus } from '.prisma/client-tenant';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTenant: PrismaTenantService,
  ) {}

  /**
   * Каждый день в 00:05 проверяем просроченные рассрочки по всем тенантам
   */
  @Cron(CronExpression.EVERY_DAY_AT_5AM) // 00:05 каждый день
  // @Cron('*/10 * * * * *') // для теста — каждые 10 секунд
  async handleOverdueInstallments() {
    this.logger.log('Checking overdue installments...');

    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
    });

    console.log(`Найдено активных тенантов: ${tenants.length}`);

    let totalProcessed = 0;

    for (const tenant of tenants) {
      try {
        // 2. Получаем Prisma-клиент для этого тенанта
        const client = this.prismaTenant.getTenantPrismaClient(tenant);

        // 3. Ищем просроченные рассрочки
        const overdue = await client.installment.findMany({
          where: {
            status: InstallmentStatus.PENDING,
            dueDate: { lt: new Date() },
          },
          select: { id: true, saleId: true, customerId: true, remaining: true },
        });

        if (overdue.length > 0) {
          console.log(
            `Тенант ${tenant.name} (${tenant.id}): найдено ${overdue.length} просроченных рассрочек`,
          );

          for (const inst of overdue) {
            await client.installment.update({
              where: { id: inst.id },
              data: { status: InstallmentStatus.OVERDUE },
            });

            totalProcessed++;

            // Опционально: логируем или отправляем уведомление
            console.log(
              `Рассрочка ${inst.id} (продажа ${inst.saleId}) просрочена. Остаток: ${inst.remaining.toString()}`,
            );

            // Здесь можно добавить уведомление клиенту/менеджеру
            // await this.notificationService.sendOverdueNotification(
            //   tenant.id,
            //   inst.customerId,
            //   inst.id,
            // );
          }
        }
      } catch (error) {
        console.error(
          `Ошибка при проверке тенанта ${tenant.name} (${tenant.id}):`,
          error,
        );
      }
    }

    console.log(
      `✅ Проверка завершена. Обработано просроченных рассрочек: ${totalProcessed}`,
    );
  }
}
