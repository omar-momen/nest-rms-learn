import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { STATUS_CODES } from 'node:http';

import type { ErrorResponseBody } from '@/common/responses';

/**
 * Last-resort filter: turns every uncaught exception into the unified error body.
 * Other filters (e.g. `PrismaExceptionFilter`) extend it so all errors share one shape.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, error, issues } = this.describe(exception, status);

    const path = request.originalUrl;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      message,
      path,
      timestamp: new Date().toISOString(),
      ...(issues !== undefined ? { issues } : {}),
    };

    httpAdapter.reply(ctx.getResponse(), body, status);
  }

  private describe(
    exception: unknown,
    status: number,
  ): Pick<ErrorResponseBody, 'message' | 'error' | 'issues'> {
    const fallbackError = STATUS_CODES[status] ?? 'Error';

    if (!(exception instanceof HttpException)) {
      return { message: 'Internal server error', error: fallbackError };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response, error: fallbackError };
    }

    const { message, error, issues } = response as {
      message?: string | string[];
      error?: string;
      issues?: unknown;
    };

    return {
      message: message ?? exception.message,
      error: error ?? fallbackError,
      ...(issues !== undefined ? { issues } : {}),
    };
  }
}
