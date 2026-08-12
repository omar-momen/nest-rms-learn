import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, map } from 'rxjs';

import type { DataResponseBody } from '@/common/responses';
import { SKIP_DATA_RESPONSE_KEY } from './skip-data-response.decorator';

/**
 * Wraps every successful controller result in the unified data envelope.
 */
@Injectable()
export class DataResponseInterceptor<T> implements NestInterceptor<
  T,
  T | DataResponseBody<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | DataResponseBody<T>> {
    const skipDataResponse = this.reflector.getAllAndOverride<boolean>(
      SKIP_DATA_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipDataResponse) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        data,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
