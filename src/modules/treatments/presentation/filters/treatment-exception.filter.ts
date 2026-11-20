import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DuplicateTreatmentCodeError,
  TreatmentAlreadyInactiveError,
  TreatmentNotFoundError,
} from '../../domain/treatment.errors';

@Catch(DuplicateTreatmentCodeError, TreatmentAlreadyInactiveError, TreatmentNotFoundError)
export class TreatmentExceptionFilter implements ExceptionFilter {
  catch(
    exception: DuplicateTreatmentCodeError | TreatmentAlreadyInactiveError | TreatmentNotFoundError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof TreatmentNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof DuplicateTreatmentCodeError
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
