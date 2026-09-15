import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Optional,
  ParseUUIDPipe,
  type ParseUUIDPipeOptions,
  PipeTransform,
} from '@nestjs/common';

/**
 * Same as Nest `ParseUUIDPipe`, but throws `errors.invalid_uuid` for the
 * exception filter to translate.
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string> {
  private readonly inner: ParseUUIDPipe;

  constructor(@Optional() options?: ParseUUIDPipeOptions) {
    this.inner = new ParseUUIDPipe({
      ...options,
      exceptionFactory: () => new BadRequestException('errors.invalid_uuid'),
    });
  }

  transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    return this.inner.transform(value, metadata);
  }
}
