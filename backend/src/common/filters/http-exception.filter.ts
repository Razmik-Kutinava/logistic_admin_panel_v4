import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | object;
    
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : response;
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
      // Логирование для 500 ошибок
      this.logger.error(
        `Internal Server Error: ${request.method} ${request.url}`,
        exception.stack,
      );
      this.logger.error('Error details:', {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      });
      this.logger.debug('Request body:', JSON.stringify(request.body, null, 2));
    } else {
      message = 'Internal server error';
      this.logger.error(
        `Unknown error: ${request.method} ${request.url}`,
        String(exception),
      );
    }

    // Логирование для других ошибок
    if (status >= 400 && status < 500) {
      this.logger.warn(
        `HTTP ${status}: ${request.method} ${request.url}`,
        typeof message === 'string' ? message : JSON.stringify(message),
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : message,
    });
  }
}

