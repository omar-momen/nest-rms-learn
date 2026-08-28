import type { UserRole } from '@generated/prisma/enums';

export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}
