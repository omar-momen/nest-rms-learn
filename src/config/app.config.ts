import { registerAs } from '@nestjs/config';

/**
 * Registered configuration namespace for application-wide settings (e.g. NODE_ENV)
 */
export const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV,
  apiVersion: process.env.API_VERSION ?? '1',
}));
