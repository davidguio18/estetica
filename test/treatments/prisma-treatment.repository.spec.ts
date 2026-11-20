import { PrismaTreatmentRepository } from '../../src/modules/treatments/infrastructure/prisma-treatment.repository';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { AuditLogger } from '../../src/shared/ports/audit-logger.port';
import { Treatment } from '../../src/modules/treatments/domain/treatment.entity';

const id = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';

const row = (overrides: Record<string, unknown> = {}) =>
  ({
    id,
    code: 'TR-001',
    name: 'Limpieza facial profunda',
    description: 'Limpieza profunda',
    duration_minutes: 60,
    price: 150000,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  }) as unknown as {
    id: string;
    code: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: { toString(): string };
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  };

describe('PrismaTreatmentRepository', () => {
  it('creates and audits a treatment in the same interactive transaction', async () => {
    const audit: jest.Mocked<AuditLogger> = {
      record: jest.fn(),
      recordInTransaction: jest.fn().mockResolvedValue(undefined),
    };
    const create = jest.fn().mockResolvedValue(row());
    const transaction = { treatments: { create } };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTreatmentRepository(prisma, audit);
    const treatment = Treatment.create({
      code: 'TR-001',
      name: 'Limpieza facial profunda',
      description: 'Limpieza profunda',
      durationMinutes: 60,
      price: 150000,
    });

    const result = await repository.create(treatment, actor);

    expect(create).toHaveBeenCalled();
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'TREATMENT_CREATED',
        entityId: id,
        entityType: 'TREATMENT',
      }),
    );
    expect(result.toData().isActive).toBe(true);
  });

  it('does not record separate audit data when transactional audit fails', async () => {
    const audit: jest.Mocked<AuditLogger> = {
      record: jest.fn(),
      recordInTransaction: jest.fn().mockRejectedValue(new Error('audit failed')),
    };
    const create = jest.fn().mockResolvedValue(row());
    const transaction = { treatments: { create } };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTreatmentRepository(prisma, audit);
    const treatment = Treatment.create({
      code: 'TR-001',
      name: 'Limpieza facial profunda',
      durationMinutes: 60,
      price: 150000,
    });

    await expect(repository.create(treatment, actor)).rejects.toThrow('audit failed');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('updates omitted fields through a transaction without deleting them', async () => {
    const audit: jest.Mocked<AuditLogger> = {
      record: jest.fn(),
      recordInTransaction: jest.fn().mockResolvedValue(undefined),
    };
    const existing = row();
    const findUnique = jest.fn().mockResolvedValue(existing);
    const update = jest.fn().mockResolvedValue(row({ name: 'Nuevo nombre' }));
    const transaction = { treatments: { findUnique, update } };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTreatmentRepository(prisma, audit);

    await repository.update(id, { name: 'Nuevo nombre' }, actor);

    expect(update).toHaveBeenCalledWith({
      where: { id },
      data: expect.objectContaining({
        name: 'Nuevo nombre',
        code: undefined,
        duration_minutes: undefined,
      }),
    });
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'TREATMENT_UPDATED',
        oldValues: expect.objectContaining({ name: 'Limpieza facial profunda' }),
        newValues: expect.objectContaining({ name: 'Nuevo nombre' }),
      }),
    );
  });

  it('deactivates without issuing a delete operation', async () => {
    const audit: jest.Mocked<AuditLogger> = {
      record: jest.fn(),
      recordInTransaction: jest.fn().mockResolvedValue(undefined),
    };
    const existing = row();
    const findUnique = jest.fn().mockResolvedValue(existing);
    const update = jest.fn().mockResolvedValue(row({ is_active: false }));
    const deleteMany = jest.fn();
    const transaction = { treatments: { findUnique, update, deleteMany } };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaTreatmentRepository(prisma, audit);

    const result = await repository.deactivate(id, actor);

    expect(update).toHaveBeenCalledWith({
      where: { id },
      data: { is_active: false, updated_at: expect.any(Date) },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result.toData().isActive).toBe(false);
  });

  it('lists treatments with search and active filters', async () => {
    const findMany = jest.fn().mockResolvedValue([row()]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[row()], 1]),
      treatments: { findMany, count },
    } as unknown as PrismaService;
    const repository = new PrismaTreatmentRepository(prisma, {
      record: jest.fn(),
      recordInTransaction: jest.fn(),
    });

    const result = await repository.findMany({
      page: 2,
      limit: 10,
      isActive: true,
      search: 'facial',
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        is_active: true,
        OR: [
          { code: { contains: 'facial', mode: 'insensitive' } },
          { name: { contains: 'facial', mode: 'insensitive' } },
        ],
      },
      skip: 10,
      take: 10,
      orderBy: { created_at: 'desc' },
    });
    expect(count).toHaveBeenCalled();
    expect(result.total).toBe(1);
  });
});
