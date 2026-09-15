import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  en: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  ar: string;
}
