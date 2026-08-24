import type { Request } from 'express';

import type { UserRole } from './user-role';

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
