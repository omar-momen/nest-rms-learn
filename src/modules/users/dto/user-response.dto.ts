import type { UserRole } from '@/modules/auth/types/user-role';

export class UserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  loyaltyPointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}
