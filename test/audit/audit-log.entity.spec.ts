import { AuditLog, InvalidAuditLogError } from '../../src/modules/audit/domain/audit-log.entity';

describe('AuditLog', () => {
  it('creates a valid audit log with nullable fields', () => {
    const log = AuditLog.create({
      userId: null,
      action: 'create',
      entityType: 'product',
      entityId: null,
      oldValues: null,
      newValues: { name: 'Product' },
      ipAddress: null,
    });

    expect(log.toData()).toMatchObject({
      userId: null,
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: null,
    });
  });

  it('rejects invalid UUID references and empty action', () => {
    expect(() =>
      AuditLog.create({ userId: 'not-uuid', action: 'CREATE', entityType: 'USER' }),
    ).toThrow(InvalidAuditLogError);
    expect(() => AuditLog.create({ action: '', entityType: 'USER' })).toThrow(InvalidAuditLogError);
  });
});
