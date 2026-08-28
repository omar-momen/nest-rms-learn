import type { UserRole } from '@generated/prisma/enums';

export class UserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  loyaltyPointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}
