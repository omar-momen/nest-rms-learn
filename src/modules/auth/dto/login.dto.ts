import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { PASSWORD_MAX_LENGTH } from '@/utils/password.util';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Cap length to limit bcrypt CPU cost; no raised min (legacy passwords). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
