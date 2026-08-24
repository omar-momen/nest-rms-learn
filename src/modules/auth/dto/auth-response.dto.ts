import type { UserRole } from '@/modules/auth/types/user-role';

export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}
