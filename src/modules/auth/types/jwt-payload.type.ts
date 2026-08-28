import type { Request } from 'express';

import type { UserRole } from '@generated/prisma/enums';

export type JwtPayload = {
  sub: string;
  username: string;
  familyId: string;
};

export type AuthenticatedUser = JwtPayload & {
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
