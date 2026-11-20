import { movement_type } from '@prisma/client';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface PageOptions {
  page: number;
  limit: number;
  active?: boolean;
  search?: string;
}
export interface InventoryRepository {
  createCategory(data: { name: string; description?: string }): Promise<unknown>;
  listCategories(options: PageOptions): Promise<{ items: unknown[]; total: number }>;
  findCategory(id: string): Promise<unknown | null>;
  updateCategory(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<unknown>;
  deactivateCategory(id: string): Promise<unknown>;
  createSupplier(data: {
    name: string;
    taxId?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<unknown>;
  listSuppliers(options: PageOptions): Promise<{ items: unknown[]; total: number }>;
  findSupplier(id: string): Promise<unknown | null>;
  updateSupplier(
    id: string,
    data: {
      name?: string;
      taxId?: string;
      phone?: string;
      email?: string;
      address?: string;
      isActive?: boolean;
    },
  ): Promise<unknown>;
  deactivateSupplier(id: string): Promise<unknown>;
  createProduct(data: {
    categoryId: string;
    sku: string;
    name: string;
    description?: string;
    brand?: string;
    unitOfMeasure?: string;
    minimumStock?: number;
  }): Promise<unknown>;
  listProducts(
    options: PageOptions & { categoryId?: string },
  ): Promise<{ items: unknown[]; total: number }>;
  findProduct(id: string): Promise<unknown | null>;
  updateProduct(
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
  ): Promise<unknown>;
  productStock(id: string): Promise<{ product: unknown; availableQuantity: string } | null>;
  createBatch(data: {
    productId: string;
    supplierId?: string;
    batchNumber: string;
    manufacturingDate?: Date;
    expirationDate: Date;
    purchasePrice?: number;
    initialQuantity: number;
    performedBy: string;
  }): Promise<unknown>;
  listBatches(productId: string): Promise<unknown[]>;
  registerMovement(data: {
    batchId: string;
    movementType: movement_type;
    quantity: number;
    reference?: string;
    notes?: string;
    performedBy: string;
  }): Promise<unknown>;
}
