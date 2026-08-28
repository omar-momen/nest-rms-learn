import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

import { UserRole } from '@generated/prisma/enums';
import { CreateUserDto } from './create-user.dto';

/** Dashboard-only update — can change role in addition to email/password. */
export class UpdateUserAdminDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
