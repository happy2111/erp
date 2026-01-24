import { Global, Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditHelper } from './audit.helper';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditHelper],
  exports: [AuditLogsService, AuditHelper],
})
export class AuditLogsModule {}
