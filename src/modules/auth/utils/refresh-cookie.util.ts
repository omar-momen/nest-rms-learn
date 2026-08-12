import { Response } from 'express';

import { REFRESH_TOKEN_COOKIE } from '../constants';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  maxAgeMs: number,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/auth',
    maxAge: maxAgeMs,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/auth',
  });
}
