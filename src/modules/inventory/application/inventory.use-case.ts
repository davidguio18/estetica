import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { movement_type } from '@prisma/client';
import { AUDIT_LOGGER, AuditLogger } from '../../../shared/ports/audit-logger.port';
import {
  INVENTORY_REPOSITORY,
  InventoryRepository,
  PageOptions,
} from './ports/inventory.repository.port';
import { InventoryNotFoundError } from '../domain/inventory.errors';

@Injectable()
export class InventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly repository: InventoryRepository,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async createCategory(
    data: { name: string; description?: string },
    actor: string,
  ): Promise<unknown> {
    const item = await this.repository.createCategory(data);
    await this.record(actor, 'CATEGORY_CREATED', 'CATEGORY', item);
    return item;
  }
  listCategories(options: PageOptions) {
    return this.repository.listCategories(options);
  }
  async findCategory(id: string) {
    return this.require(this.repository.findCategory(id), 'Category');
  }
  async updateCategory(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
    actor: string,
  ): Promise<unknown> {
    const item = await this.repository.updateCategory(id, data);
    await this.record(actor, 'CATEGORY_UPDATED', 'CATEGORY', item);
    return item;
  }
  async deactivateCategory(id: string, actor: string): Promise<unknown> {
    const item = await this.repository.deactivateCategory(id);
    await this.record(actor, 'CATEGORY_DEACTIVATED', 'CATEGORY', item);
    return item;
  }
  async createSupplier(
    data: { name: string; taxId?: string; phone?: string; email?: string; address?: string },
    actor: string,
  ): Promise<unknown> {
    const item = await this.repository.createSupplier(data);
    await this.record(actor, 'SUPPLIER_CREATED', 'SUPPLIER', item);
    return item;
  }
  listSuppliers(options: PageOptions) {
    return this.repository.listSuppliers(options);
  }
  async findSupplier(id: string) {
    return this.require(this.repository.findSupplier(id), 'Supplier');
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
    actor: string,
  ): Promise<unknown> {
    const item = await this.repository.updateSupplier(id, data);
    await this.record(actor, 'SUPPLIER_UPDATED', 'SUPPLIER', item);
    return item;
  }
  async deactivateSupplier(id: string, actor: string): Promise<unknown> {
    const item = await this.repository.deactivateSupplier(id);
    await this.record(actor, 'SUPPLIER_DEACTIVATED', 'SUPPLIER', item);
    return item;
  }
  async createProduct(
    data: {
      categoryId: string;
      sku: string;
      name: string;
      description?: string;
      brand?: string;
      unitOfMeasure?: string;
      minimumStock?: number;
    },
    actor: string,
  ): Promise<unknown> {
    this.nonNegative(data.minimumStock);
    const item = await this.repository.createProduct(data);
    await this.record(actor, 'PRODUCT_CREATED', 'PRODUCT', item);
    return item;
  }
  listProducts(options: PageOptions & { categoryId?: string }) {
    return this.repository.listProducts(options);
  }
  async findProduct(id: string) {
    return this.require(this.repository.findProduct(id), 'Product');
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
    actor: string,
  ): Promise<unknown> {
    this.nonNegative(data.minimumStock);
    const item = await this.repository.updateProduct(id, data);
    await this.record(actor, 'PRODUCT_UPDATED', 'PRODUCT', item);
    return item;
  }
  async productStock(id: string) {
    return this.require(this.repository.productStock(id), 'Product');
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
  }): Promise<unknown> {
    this.positive(data.initialQuantity);
    this.nonNegative(data.purchasePrice);
    if (data.manufacturingDate && data.manufacturingDate > data.expirationDate)
      throw new BadRequestException('Manufacturing date cannot be after expiration date');
    const item = await this.repository.createBatch(data);
    return item;
  }
  listBatches(productId: string) {
    return this.repository.listBatches(productId);
  }
  async registerMovement(data: {
    batchId: string;
    movementType: movement_type;
    quantity: number;
    reference?: string;
    notes?: string;
    performedBy: string;
  }): Promise<unknown> {
    this.positive(data.quantity);
    return this.repository.registerMovement(data);
  }
  private positive(value: number) {
    if (!Number.isFinite(value) || value <= 0)
      throw new BadRequestException('Quantity must be greater than zero');
  }
  private nonNegative(value: number | undefined) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      throw new BadRequestException('Value cannot be negative');
  }
  private async record(userId: string, action: string, entityType: string, item: unknown) {
    const data = item as { id?: string };
    await this.audit.record({
      userId,
      action,
      entityType,
      entityId: data.id,
      newValues: JSON.parse(JSON.stringify(item)) as unknown,
    });
  }
  private async require<T>(promise: Promise<T | null>, entity: string): Promise<T> {
    const item = await promise;
    if (!item) throw new InventoryNotFoundError(entity);
    return item;
  }
}
