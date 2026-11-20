export class InventoryNotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`);
  }
}

export class InventoryConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super('Insufficient stock for this movement');
  }
}
