import type { Request } from 'express';

export type JwtPayload = {
  sub: string;
  username: string;
  familyId: string;
};

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};
