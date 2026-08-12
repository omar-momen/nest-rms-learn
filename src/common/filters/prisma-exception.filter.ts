import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';

import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

/**
 * Maps the Prisma error codes we expect to hit onto HTTP exceptions.
 * Anything unmapped falls through to `AllExceptionsFilter` (500 + logged stack).
 */
@Injectable()
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends AllExceptionsFilter {
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
        return new BadRequestException(
          `Value too long for ${this.describeMeta(meta?.column_name) ?? 'a field'}`,
        );
      case 'P2001':
      case 'P2025':
        return new NotFoundException('Record not found');
      case 'P2002':
        return new ConflictException(
          `Already exists: ${this.describeMeta(meta?.target) ?? 'duplicate value'}`,
        );
      case 'P2003':
        return new BadRequestException(
          `Related record not found for ${this.describeMeta(meta?.field_name) ?? 'a relation'}`,
        );
      case 'P2011':
        return new BadRequestException(
          `Missing required value for ${this.describeMeta(meta?.constraint) ?? 'a field'}`,
        );
      case 'P2014':
        return new BadRequestException(
          'Change would break a required relation',
        );
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
}
