import { PrismaService } from '../../src/shared/database/prisma.service';
import { PrismaAuditLogRepository } from '../../src/modules/audit/infrastructure/prisma-audit-log.repository';
import { AuditLog } from '../../src/modules/audit/domain/audit-log.entity';

describe('PrismaAuditLogRepository', () => {
  it('persists audit logs through audit_logs and maps filters', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const transaction = jest.fn((operations: Promise<unknown>[]) => Promise.all(operations));
    const prisma = {
      audit_logs: { create, findMany, count },
      $transaction: transaction,
    } as unknown as PrismaService;
    const repository = new PrismaAuditLogRepository(prisma);
    const userId = '11111111-1111-4111-8111-111111111111';
    const log = AuditLog.create({
      userId,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userId,
      newValues: { ok: true },
    });

    await repository.create(log);
    await repository.findMany({
      userId,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      page: 2,
      limit: 10,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: userId,
        action: 'LOGIN',
        entity_type: 'USER',
        entity_id: userId,
        new_values: { ok: true },
      }),
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'LOGIN', entity_type: 'USER' }),
        orderBy: { created_at: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
  });
});
