import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CreateAuditLogUseCase } from '../../src/modules/audit/application/create-audit-log.use-case';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
} from '../../src/modules/audit/application/ports/audit-log.repository.port';

describe('CreateAuditLogUseCase', () => {
  let useCase: CreateAuditLogUseCase;
  let repository: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockResolvedValue(undefined),
      createInTransaction: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateAuditLogUseCase, { provide: AUDIT_LOG_REPOSITORY, useValue: repository }],
    }).compile();
    useCase = module.get(CreateAuditLogUseCase);
  });

  it('creates and persists an audit log with nullable user and entity IDs', async () => {
    await useCase.execute({
      userId: null,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: null,
      newValues: { reason: 'invalid_credentials' },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        toData: expect.any(Function),
      }),
    );
    expect(repository.create.mock.calls[0][0].toData()).toMatchObject({
      userId: null,
      entityId: null,
      action: 'LOGIN_FAILED',
    });
  });

  it('removes sensitive keys before persistence', async () => {
    await useCase.execute({
      userId: null,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      newValues: {
        password: 'secret',
        password_hash: 'hash',
        passwordHash: 'camel-case-hash',
        accessToken: 'access',
        tokenHash: 'hash',
        token: 'token',
        nested: { refresh_token: 'refresh', safe: true },
      },
    });

    const values = repository.create.mock.calls[0][0].toData().newValues;
    expect(values).toEqual({ nested: { safe: true } });
    expect(JSON.stringify(values)).not.toMatch(/password|token|secret|hash/i);
  });

  it('forwards the transaction client and sanitizes values for transactional audit writes', async () => {
    const transaction = {} as Prisma.TransactionClient;

    await useCase.recordInTransaction(transaction, {
      userId: '11111111-1111-4111-8111-111111111111',
      action: 'PATIENT_UPDATED',
      entityType: 'PATIENT',
      entityId: '11111111-1111-4111-8111-111111111111',
      oldValues: { safe: true, passwordHash: 'secret' },
      newValues: { safe: false, refresh_token: 'secret' },
    });

    const [usedTransaction, auditLog] = (repository.createInTransaction as jest.Mock).mock.calls[0];
    expect(usedTransaction).toBe(transaction);
    expect(auditLog.toData().oldValues).toEqual({ safe: true });
    expect(auditLog.toData().newValues).toEqual({ safe: false });
  });

  it('rejects circular and non-serializable numeric values', async () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    await expect(
      useCase.execute({
        userId: null,
        action: 'UPDATE',
        entityType: 'USER',
        newValues: circular as never,
      }),
    ).rejects.toThrow('circular references');

    await expect(
      useCase.execute({
        userId: null,
        action: 'UPDATE',
        entityType: 'USER',
        newValues: { value: Number.NaN },
      }),
    ).rejects.toThrow('valid JSON numbers');

    await expect(
      useCase.execute({
        userId: null,
        action: 'UPDATE',
        entityType: 'USER',
        newValues: { nested: undefined } as never,
      }),
    ).rejects.toThrow('only JSON data');
  });
});
