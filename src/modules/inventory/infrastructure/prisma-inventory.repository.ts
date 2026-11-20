import { Injectable } from '@nestjs/common';
import { movement_type, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AUDIT_LOGGER, AuditLogger } from '../../../shared/ports/audit-logger.port';
import { Inject } from '@nestjs/common';
import {
  InventoryConflictError,
  InventoryNotFoundError,
  InsufficientStockError,
} from '../domain/inventory.errors';
import { InventoryRepository, PageOptions } from '../application/ports/inventory.repository.port';

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}
  async createCategory(data: { name: string; description?: string }) {
    return this.guardUnique(
      () =>
        this.prisma.categories.create({ data: { name: data.name, description: data.description } }),
      'Category name already exists',
    );
  }
  async listCategories(options: PageOptions) {
    return this.page(this.prisma.categories, options, {
      name: { contains: options.search, mode: 'insensitive' },
      is_active: options.active,
    });
  }
  findCategory(id: string) {
    return this.prisma.categories.findUnique({ where: { id } });
  }
  async updateCategory(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ) {
    await this.requireCategory(id);
    return this.guardUnique(
      () =>
        this.prisma.categories.update({
          where: { id },
          data: { name: data.name, description: data.description, is_active: data.isActive },
        }),
      'Category name already exists',
    );
  }
  async deactivateCategory(id: string) {
    await this.requireCategory(id);
    return this.prisma.categories.update({ where: { id }, data: { is_active: false } });
  }
  createSupplier(data: {
    name: string;
    taxId?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    return this.prisma.suppliers.create({
      data: {
        name: data.name,
        tax_id: data.taxId,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
    });
  }
  async listSuppliers(options: PageOptions) {
    return this.page(this.prisma.suppliers, options, {
      name: { contains: options.search, mode: 'insensitive' },
      is_active: options.active,
    });
  }
  findSupplier(id: string) {
    return this.prisma.suppliers.findUnique({ where: { id } });
  }
  async updateSupplier(
    id: string,
    data: {
      name?: string;
      taxId?: string;
      phone?: string;
      email?: string;
      address?: string;
      isActive?: boolean;
    },
  ) {
    await this.requireSupplier(id);
    return this.prisma.suppliers.update({
      where: { id },
      data: { ...this.supplierData(data), is_active: data.isActive },
    });
  }
  async deactivateSupplier(id: string) {
    await this.requireSupplier(id);
    return this.prisma.suppliers.update({ where: { id }, data: { is_active: false } });
  }
  async createProduct(data: {
    categoryId: string;
    sku: string;
    name: string;
    description?: string;
    brand?: string;
    unitOfMeasure?: string;
    minimumStock?: number;
  }) {
    await this.requireActiveCategory(data.categoryId);
    return this.guardUnique(
      () =>
        this.prisma.products.create({
          data: {
            category_id: data.categoryId,
            sku: data.sku,
            name: data.name,
            description: data.description,
            brand: data.brand,
            unit_of_measure: data.unitOfMeasure,
            minimum_stock: data.minimumStock,
          },
        }),
      'Product SKU already exists',
    );
  }
  async listProducts(options: PageOptions & { categoryId?: string }) {
    return this.page(
      this.prisma.products,
      options,
      {
        category_id: options.categoryId,
        is_active: options.active,
        OR: options.search
          ? [
              { name: { contains: options.search, mode: 'insensitive' } },
              { sku: { contains: options.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      { categories: true },
    );
  }
  findProduct(id: string) {
    return this.prisma.products.findUnique({ where: { id }, include: { categories: true } });
  }
  async updateProduct(
    id: string,
    data: {
      categoryId?: string;
      sku?: string;
      name?: string;
      description?: string;
      brand?: string;
      unitOfMeasure?: string;
      minimumStock?: number;
      isActive?: boolean;
    },
  ) {
    await this.requireProduct(id);
    if (data.categoryId) await this.requireActiveCategory(data.categoryId);
    return this.guardUnique(
      () =>
        this.prisma.products.update({
          where: { id },
          data: { ...this.productData(data), is_active: data.isActive },
          include: { categories: true },
        }),
      'Product SKU already exists',
    );
  }
  async productStock(id: string) {
    const product = await this.findProduct(id);
    if (!product) return null;
    const aggregate = await this.prisma.product_batches.aggregate({
      where: { product_id: id },
      _sum: { current_quantity: true },
    });
    return { product, availableQuantity: aggregate._sum.current_quantity?.toString() ?? '0' };
  }
  async createBatch(data: {
    productId: string;
    supplierId?: string;
    batchNumber: string;
    manufacturingDate?: Date;
    expirationDate: Date;
    purchasePrice?: number;
    initialQuantity: number;
    performedBy: string;
  }) {
    await this.requireActiveProduct(data.productId);
    if (data.supplierId) await this.requireActiveSupplier(data.supplierId);
    return this.guardUnique(
      () =>
        this.prisma.$transaction(async (tx) => {
          const batch = await tx.product_batches.create({
            data: {
              product_id: data.productId,
              supplier_id: data.supplierId,
              batch_number: data.batchNumber,
              manufacturing_date: data.manufacturingDate,
              expiration_date: data.expirationDate,
              purchase_price: data.purchasePrice,
              initial_quantity: data.initialQuantity,
              current_quantity: data.initialQuantity,
            },
          });
          await tx.inventory_movements.create({
            data: {
              batch_id: batch.id,
              movement_type: movement_type.PURCHASE,
              quantity: data.initialQuantity,
              reference: 'INITIAL_BATCH',
              performed_by: data.performedBy,
            },
          });
          await this.audit.recordInTransaction!(tx, {
            userId: data.performedBy,
            action: 'BATCH_CREATED',
            entityType: 'PRODUCT_BATCH',
            entityId: batch.id,
            newValues: this.auditValue(batch),
          });
          return batch;
        }),
      'A batch with this number already exists for the product',
    );
  }
  async listBatches(productId: string) {
    await this.requireProduct(productId);
    return this.prisma.product_batches.findMany({
      where: { product_id: productId },
      include: { suppliers: true },
      orderBy: { expiration_date: 'asc' },
    });
  }
  async registerMovement(data: {
    batchId: string;
    movementType: movement_type;
    quantity: number;
    reference?: string;
    notes?: string;
    performedBy: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; current_quantity: Prisma.Decimal }>
      >`SELECT id, current_quantity FROM inventory.product_batches WHERE id = ${data.batchId}::uuid FOR UPDATE`;
      const batch = rows[0];
      if (!batch) throw new InventoryNotFoundError('Product batch');
      const increases: movement_type[] = [
        movement_type.PURCHASE,
        movement_type.ADJUSTMENT_IN,
        movement_type.RETURN,
      ];
      const current = Number(batch.current_quantity);
      const next = increases.includes(data.movementType)
        ? current + data.quantity
        : current - data.quantity;
      if (next < 0) throw new InsufficientStockError();
      await tx.product_batches.update({
        where: { id: data.batchId },
        data: { current_quantity: next },
      });
      const movement = await tx.inventory_movements.create({
        data: {
          batch_id: data.batchId,
          movement_type: data.movementType,
          quantity: data.quantity,
          reference: data.reference,
          notes: data.notes,
          performed_by: data.performedBy,
        },
      });
      await this.audit.recordInTransaction!(tx, {
        userId: data.performedBy,
        action: `INVENTORY_${data.movementType}`,
        entityType: 'INVENTORY_MOVEMENT',
        entityId: movement.id,
        newValues: this.auditValue(movement),
      });
      return movement;
    });
  }
  private async page(
    delegate: { findMany: Function; count: Function },
    options: PageOptions,
    where: object,
    include?: object,
  ): Promise<{ items: unknown[]; total: number }> {
    const skip = (options.page - 1) * options.limit;
    const [items, total] = await Promise.all([
      delegate.findMany({
        where,
        include,
        skip,
        take: options.limit,
        orderBy: { created_at: 'desc' },
      }),
      delegate.count({ where }),
    ]);
    return { items, total };
  }
  private supplierData(data: {
    name?: string;
    taxId?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    return {
      name: data.name,
      tax_id: data.taxId,
      phone: data.phone,
      email: data.email,
      address: data.address,
    };
  }
  private productData(data: {
    categoryId?: string;
    sku?: string;
    name?: string;
    description?: string;
    brand?: string;
    unitOfMeasure?: string;
    minimumStock?: number;
  }) {
    return {
      category_id: data.categoryId,
      sku: data.sku,
      name: data.name,
      description: data.description,
      brand: data.brand,
      unit_of_measure: data.unitOfMeasure,
      minimum_stock: data.minimumStock,
    };
  }
  private async requireCategory(id: string) {
    if (!(await this.findCategory(id))) throw new InventoryNotFoundError('Category');
  }
  private async requireSupplier(id: string) {
    if (!(await this.findSupplier(id))) throw new InventoryNotFoundError('Supplier');
  }
  private async requireProduct(id: string) {
    if (!(await this.findProduct(id))) throw new InventoryNotFoundError('Product');
  }
  private async requireActiveCategory(id: string) {
    const item = await this.findCategory(id);
    if (!item || !item.is_active) throw new InventoryNotFoundError('Active category');
  }
  private async requireActiveSupplier(id: string) {
    const item = await this.findSupplier(id);
    if (!item || !item.is_active) throw new InventoryNotFoundError('Active supplier');
  }
  private async requireActiveProduct(id: string) {
    const item = await this.findProduct(id);
    if (!item || !item.is_active) throw new InventoryNotFoundError('Active product');
  }
  private async guardUnique<T>(operation: () => Promise<T>, message: string): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new InventoryConflictError(message);
      throw error;
    }
  }
  private auditValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value)) as unknown;
  }
}
