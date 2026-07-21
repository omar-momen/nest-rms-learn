import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.NODE_ENV === 'development',
}));
