import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

import { Prisma } from '@generated/prisma/client';

import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

/**
 * Maps the Prisma error codes we expect to hit onto HTTP exceptions.
 * Anything unmapped falls through to `AllExceptionsFilter` (500 + logged stack).
 * `message` keys are translated by nestjs-i18n in `AllExceptionsFilter`.
 */
@Injectable()
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends AllExceptionsFilter {
  constructor(httpAdapterHost: HttpAdapterHost, i18n: I18nService) {
    super(httpAdapterHost, i18n);
  }

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    super.catch(this.toHttpException(exception) ?? exception, host);
  }

  private toHttpException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException | undefined {
    const { code, meta } = exception;

    switch (code) {
      case 'P2000':
        return new BadRequestException({
          message: 'errors.value_too_long',
          i18nArgs: {
            field: this.describeMeta(meta?.column_name) ?? 'a field',
          },
        });
      case 'P2001':
      case 'P2025':
        return new NotFoundException('errors.record_not_found');
      case 'P2002':
        return new ConflictException({
          message: 'errors.already_exists',
          i18nArgs: {
            target:
              this.describeMeta(meta?.target) ??
              this.describeConstraintFields(meta) ??
              'duplicate value',
          },
        });
      case 'P2003':
        return new BadRequestException({
          message: 'errors.related_record_not_found',
          i18nArgs: {
            field: this.describeMeta(meta?.field_name) ?? 'a relation',
          },
        });
      case 'P2011':
        return new BadRequestException({
          message: 'errors.missing_required_value',
          i18nArgs: {
            field: this.describeMeta(meta?.constraint) ?? 'a field',
          },
        });
      case 'P2014':
        return new BadRequestException('errors.required_relation');
      default:
        return undefined;
    }
  }

  private describeMeta(target: unknown): string | undefined {
    if (Array.isArray(target)) {
      return target.join(', ');
    }
    return typeof target === 'string' ? target : undefined;
  }

  /** Driver adapters (e.g. `@prisma/adapter-pg`) report the constraint here instead of `meta.target`. */
  private describeConstraintFields(meta: unknown): string | undefined {
    const constraint = (
      meta as
        | {
            driverAdapterError?: { cause?: { constraint?: unknown } };
          }
        | undefined
    )?.driverAdapterError?.cause?.constraint;

    if (
      typeof constraint === 'object' &&
      constraint !== null &&
      'fields' in constraint
    ) {
      return this.describeMeta(constraint.fields);
    }

    return this.describeMeta(constraint);
  }
}
