import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { DuplicateUserError } from '../../application/errors/duplicate-user.error';
import { InvalidCredentialsError } from '../../application/errors/invalid-credentials.error';
import { RefreshTokenError } from '../../application/errors/refresh-token.error';
import { InvalidUserError } from '../../domain/user.entity';

@Catch(DuplicateUserError, InvalidUserError, InvalidCredentialsError, RefreshTokenError)
export class AuthDomainExceptionFilter implements ExceptionFilter {
  catch(
    exception: DuplicateUserError | InvalidUserError | InvalidCredentialsError | RefreshTokenError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isDuplicate = exception instanceof DuplicateUserError;
    const isAuthenticationError =
      exception instanceof InvalidCredentialsError || exception instanceof RefreshTokenError;
    const status = isDuplicate
      ? HttpStatus.CONFLICT
      : isAuthenticationError
        ? HttpStatus.UNAUTHORIZED
        : HttpStatus.BAD_REQUEST;
    const message = isDuplicate
      ? `User ${exception.field} already exists`
      : isAuthenticationError
        ? exception.message
        : exception.message;

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
