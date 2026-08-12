import { registerAs } from '@nestjs/config';

/**
 * Registered configuration namespace for application-wide settings (e.g. NODE_ENV)
 */
export const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV,
  apiVersion: process.env.API_VERSION ?? '1',
  jwtSecret: process.env.JWT_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN,
}));
