import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { LocalizedTextDto } from '@/common/dto/localized-text.dto';

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;
}
