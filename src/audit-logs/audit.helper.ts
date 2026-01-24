import { Injectable } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { Prisma } from '.prisma/client-tenant';

@Injectable()
export class AuditHelper {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  async log(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: {
      userId?: string;
      action: string;
      entity: string;
      entityId?: string;
      oldValue?: any;
      newValue?: any;
      note?: string;
    },
  ) {
    return this.auditLogsService.create(tx, organizationId, dto);
  }
}
