import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { DuplicateUserError } from '../../application/errors/duplicate-user.error';
import { InvalidUserError } from '../../domain/user.entity';

@Catch(DuplicateUserError, InvalidUserError)
export class AuthDomainExceptionFilter implements ExceptionFilter {
  catch(exception: DuplicateUserError | InvalidUserError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isDuplicate = exception instanceof DuplicateUserError;
    const status = isDuplicate ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
    const message = isDuplicate ? `User ${exception.field} already exists` : exception.message;

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
