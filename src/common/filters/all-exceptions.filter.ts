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
import { I18nContext, I18nService, I18nValidationException } from 'nestjs-i18n';
import type { ValidationError } from 'class-validator';

import type { ErrorResponseBody } from '@/common/responses';

type I18nArgs = Record<string, string>;

/**
 * Last-resort filter: turns every uncaught exception into the unified error body.
 * Other filters (e.g. `PrismaExceptionFilter`) extend it so all errors share one shape.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly httpAdapterHost: HttpAdapterHost,
    private readonly i18n: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const lang = I18nContext.current(host)?.lang ?? 'en';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, error, issues } = this.describe(exception, status, lang);

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
    lang: string,
  ): Pick<ErrorResponseBody, 'message' | 'error' | 'issues'> {
    const fallbackError = STATUS_CODES[status] ?? 'Error';

    if (exception instanceof I18nValidationException) {
      return {
        message: this.flattenValidationMessages(exception.errors, lang),
        error: fallbackError,
      };
    }

    if (!(exception instanceof HttpException)) {
      return {
        message: this.translate(lang, 'errors.internal_server_error'),
        error: fallbackError,
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        message: this.translate(lang, response),
        error: fallbackError,
      };
    }

    const { message, error, issues, i18nArgs } = response as {
      message?: string | string[];
      error?: string;
      issues?: unknown;
      i18nArgs?: I18nArgs;
    };

    return {
      message: this.translate(lang, message ?? exception.message, i18nArgs),
      error: error ?? fallbackError,
      ...(issues !== undefined
        ? { issues: this.translateIssues(lang, issues) }
        : {}),
    };
  }

  private translate(
    lang: string,
    message: string | string[],
    args?: I18nArgs,
  ): string | string[] {
    if (Array.isArray(message)) {
      return message.map((item) => this.translate(lang, item, args) as string);
    }
    return this.i18n.t(message, { lang, args, defaultValue: message });
  }

  private flattenValidationMessages(
    errors: ValidationError[],
    lang: string,
  ): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      for (const [constraint, raw] of Object.entries(error.constraints ?? {})) {
        const key = this.validationKey(constraint, raw);
        messages.push(
          this.i18n.t(key, {
            lang,
            args: { property: error.property },
            defaultValue: raw.includes('|') ? key : raw,
          }),
        );
      }

      if (error.children?.length) {
        messages.push(...this.flattenValidationMessages(error.children, lang));
      }
    }

    return messages;
  }

  private validationKey(constraint: string, raw: string): string {
    const encoded = raw.split('|')[0];
    if (encoded.startsWith('validation.') || encoded.startsWith('errors.')) {
      return encoded;
    }
    return `validation.${constraint}`;
  }

  private translateIssues(lang: string, issues: unknown): unknown {
    if (!Array.isArray(issues)) {
      return issues;
    }

    return (issues as unknown[]).map((issue) => {
      if (!this.isTranslatableIssue(issue)) {
        return issue;
      }

      const { message, i18nArgs, ...rest } = issue;
      return {
        ...rest,
        message: this.translate(lang, message, i18nArgs),
      };
    });
  }

  private isTranslatableIssue(
    issue: unknown,
  ): issue is { message: string; i18nArgs?: I18nArgs } & Record<
    string,
    unknown
  > {
    return (
      typeof issue === 'object' &&
      issue !== null &&
      'message' in issue &&
      typeof issue.message === 'string'
    );
  }
}
