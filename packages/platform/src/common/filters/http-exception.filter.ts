import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isProductionEnv } from '../utils/node-env';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  /** HTTP reason phrase by default; a domain error code when one is supplied. */
  error: string;
  /**
   * Machine-readable domain code (e.g. a discount failure reason) preserved
   * from the exception body so clients can map it to localized copy without
   * parsing English prose.
   */
  code?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';
    let error = HttpStatus[status] ?? 'Error';
    let code: string | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const body = exceptionResponse as {
        message?: string | string[];
        error?: string;
        code?: unknown;
      };
      message = body.message ?? message;
      error = body.error ?? error;
      if (typeof body.code === 'string' && body.code.length > 0) {
        code = body.code;
      }
    } else if (exception instanceof Error) {
      // Never leak internal Error.message to clients in production.
      if (isProductionEnv()) {
        this.logger.error(exception.message, exception.stack);
        message = 'Internal server error';
      } else {
        message = exception.message;
      }
    }

    if (!(exception instanceof HttpException) && status >= 500) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
      ...(code ? { code } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
