import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { AUDIT_LOGGER } from '../../shared/ports/audit-logger.port';
import { AUDIT_LOG_REPOSITORY } from './application/ports/audit-log.repository.port';
import { CreateAuditLogUseCase } from './application/create-audit-log.use-case';
import { ListAuditLogsUseCase } from './application/list-audit-logs.use-case';
import { PrismaAuditLogRepository } from './infrastructure/prisma-audit-log.repository';
import { AuditController } from './presentation/audit.controller';

@Global()
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AuditController],
  providers: [
    CreateAuditLogUseCase,
    ListAuditLogsUseCase,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: PrismaAuditLogRepository,
    },
    {
      provide: AUDIT_LOGGER,
      useExisting: CreateAuditLogUseCase,
    },
  ],
  exports: [AUDIT_LOGGER],
})
export class AuditModule {}
