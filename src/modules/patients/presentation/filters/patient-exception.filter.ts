import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DuplicatePatientError,
  PatientAlreadyInactiveError,
  PatientNotFoundError,
} from '../../domain/patient.errors';
@Catch(DuplicatePatientError, PatientAlreadyInactiveError, PatientNotFoundError)
export class PatientExceptionFilter implements ExceptionFilter {
  catch(
    exception: DuplicatePatientError | PatientAlreadyInactiveError | PatientNotFoundError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof PatientNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof DuplicatePatientError
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
