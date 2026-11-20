import { BadRequestException } from '@nestjs/common';
import { movement_type } from '@prisma/client';
import { InventoryUseCase } from '../../src/modules/inventory/application/inventory.use-case';
import { InventoryRepository } from '../../src/modules/inventory/application/ports/inventory.repository.port';
import { AuditLogger } from '../../src/shared/ports/audit-logger.port';

const actor = '00000000-0000-4000-8000-000000000002';
const batchId = '00000000-0000-4000-8000-000000000001';

describe('InventoryUseCase', () => {
  let repository: jest.Mocked<InventoryRepository>;
  let audit: jest.Mocked<AuditLogger>;
  let useCase: InventoryUseCase;

  beforeEach(() => {
    repository = {
      registerMovement: jest.fn(),
      createBatch: jest.fn(),
      createProduct: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;
    audit = { record: jest.fn() } as jest.Mocked<AuditLogger>;
    useCase = new InventoryUseCase(repository, audit);
  });

  it.each([0, -1])(
    'rejects a non-positive movement quantity (%s) before persistence',
    async (quantity) => {
      await expect(
        useCase.registerMovement({
          batchId,
          movementType: movement_type.ADJUSTMENT_OUT,
          quantity,
          performedBy: actor,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.registerMovement).not.toHaveBeenCalled();
    },
  );

  it('rejects a batch whose manufacturing date is after its expiration', async () => {
    await expect(
      useCase.createBatch({
        productId: batchId,
        batchNumber: 'B-1',
        manufacturingDate: new Date('2027-02-01'),
        expirationDate: new Date('2027-01-01'),
        initialQuantity: 1,
        performedBy: actor,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createBatch).not.toHaveBeenCalled();
  });

  it('does not audit a stock operation when its persistence fails', async () => {
    repository.registerMovement.mockRejectedValue(new Error('database unavailable'));
    await expect(
      useCase.registerMovement({
        batchId,
        movementType: movement_type.ADJUSTMENT_IN,
        quantity: 2,
        performedBy: actor,
      }),
    ).rejects.toThrow('database unavailable');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('audits a relevant product creation with a serializable payload', async () => {
    repository.createProduct.mockResolvedValue({ id: batchId, name: 'Botox' });
    await useCase.createProduct({ categoryId: batchId, sku: 'BTX-1', name: 'Botox' }, actor);
    expect(audit.record).toHaveBeenCalledWith({
      userId: actor,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: batchId,
      newValues: { id: batchId, name: 'Botox' },
    });
  });
});
