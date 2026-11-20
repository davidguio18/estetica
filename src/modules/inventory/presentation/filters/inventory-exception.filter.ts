import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  InventoryConflictError,
  InventoryNotFoundError,
  InsufficientStockError,
} from '../../domain/inventory.errors';

@Catch(InventoryNotFoundError, InventoryConflictError, InsufficientStockError)
export class InventoryExceptionFilter implements ExceptionFilter {
  catch(
    exception: InventoryNotFoundError | InventoryConflictError | InsufficientStockError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof InventoryNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof InventoryConflictError
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
