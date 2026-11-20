import { movement_type, Prisma } from '@prisma/client';
import { PrismaInventoryRepository } from '../../src/modules/inventory/infrastructure/prisma-inventory.repository';
import {
  InventoryNotFoundError,
  InsufficientStockError,
} from '../../src/modules/inventory/domain/inventory.errors';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { AuditLogger } from '../../src/shared/ports/audit-logger.port';

const actor = '00000000-0000-4000-8000-000000000002';
const batchId = '00000000-0000-4000-8000-000000000001';

describe('PrismaInventoryRepository stock transactions', () => {
  let transaction: {
    $queryRaw: jest.Mock;
    product_batches: { update: jest.Mock; create: jest.Mock };
    inventory_movements: { create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock; products: { findUnique: jest.Mock } };
  let audit: jest.Mocked<AuditLogger>;
  let repository: PrismaInventoryRepository;

  beforeEach(() => {
    transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id: batchId, current_quantity: new Prisma.Decimal(5) }]),
      product_batches: { update: jest.fn().mockResolvedValue({ id: batchId }), create: jest.fn() },
      inventory_movements: {
        create: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000003',
          batch_id: batchId,
          quantity: new Prisma.Decimal(2),
        }),
      },
    };
    prisma = {
      $transaction: jest.fn((operation: (client: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
      ),
      products: { findUnique: jest.fn().mockResolvedValue({ id: batchId, is_active: true }) },
    };
    audit = { record: jest.fn(), recordInTransaction: jest.fn().mockResolvedValue(undefined) };
    repository = new PrismaInventoryRepository(prisma as unknown as PrismaService, audit);
  });

  it.each([
    [movement_type.PURCHASE, 7],
    [movement_type.ADJUSTMENT_IN, 7],
    [movement_type.RETURN, 7],
    [movement_type.TREATMENT, 3],
    [movement_type.ADJUSTMENT_OUT, 3],
    [movement_type.EXPIRED, 3],
    [movement_type.DAMAGED, 3],
  ])('applies %s using its stock direction', async (movementType, expectedQuantity) => {
    await repository.registerMovement({ batchId, movementType, quantity: 2, performedBy: actor });
    expect(transaction.product_batches.update).toHaveBeenCalledWith({
      where: { id: batchId },
      data: { current_quantity: expectedQuantity },
    });
    expect(transaction.inventory_movements.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ movement_type: movementType, quantity: 2 }),
      }),
    );
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: `INVENTORY_${movementType}`,
        entityType: 'INVENTORY_MOVEMENT',
      }),
    );
  });

  it('rejects insufficient stock without writing a movement or audit log', async () => {
    await expect(
      repository.registerMovement({
        batchId,
        movementType: movement_type.TREATMENT,
        quantity: 6,
        performedBy: actor,
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(transaction.product_batches.update).not.toHaveBeenCalled();
    expect(transaction.inventory_movements.create).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('reports an unknown batch and makes no persistence writes', async () => {
    transaction.$queryRaw.mockResolvedValue([]);
    await expect(
      repository.registerMovement({
        batchId,
        movementType: movement_type.PURCHASE,
        quantity: 1,
        performedBy: actor,
      }),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    expect(transaction.product_batches.update).not.toHaveBeenCalled();
    expect(transaction.inventory_movements.create).not.toHaveBeenCalled();
  });

  it('does not create a movement or audit log when the stock update fails', async () => {
    transaction.product_batches.update.mockRejectedValue(new Error('write failure'));
    await expect(
      repository.registerMovement({
        batchId,
        movementType: movement_type.PURCHASE,
        quantity: 1,
        performedBy: actor,
      }),
    ).rejects.toThrow('write failure');
    expect(transaction.inventory_movements.create).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('creates an initial PURCHASE movement and audit log in the batch transaction', async () => {
    transaction.product_batches.create.mockResolvedValue({
      id: batchId,
      current_quantity: new Prisma.Decimal(4),
    });
    await repository.createBatch({
      productId: batchId,
      batchNumber: 'LOT-1',
      expirationDate: new Date('2027-01-01'),
      initialQuantity: 4,
      performedBy: actor,
    });
    expect(transaction.product_batches.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ initial_quantity: 4, current_quantity: 4 }),
      }),
    );
    expect(transaction.inventory_movements.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        batch_id: batchId,
        movement_type: movement_type.PURCHASE,
        quantity: 4,
        reference: 'INITIAL_BATCH',
      }),
    });
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'BATCH_CREATED',
        entityType: 'PRODUCT_BATCH',
        entityId: batchId,
      }),
    );
  });

  it('reports a missing product before attempting a batch transaction', async () => {
    prisma.products.findUnique.mockResolvedValue(null);
    await expect(
      repository.createBatch({
        productId: batchId,
        batchNumber: 'LOT-1',
        expirationDate: new Date('2027-01-01'),
        initialQuantity: 4,
        performedBy: actor,
      }),
    ).rejects.toBeInstanceOf(InventoryNotFoundError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
