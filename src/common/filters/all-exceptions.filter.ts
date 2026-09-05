import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = this.getErrorDetails(exceptionResponse);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url}`, exception);
    }

    response.status(status).json({
      statusCode: status,
      message: details.message ?? 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorDetails(response: string | object | undefined): ErrorResponse {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (response && typeof response === 'object') {
      const candidate = response as ErrorResponse;
      return {
        message: candidate.message,
        error: candidate.error,
        statusCode: candidate.statusCode,
      };
    }

    return {};
  }
}
