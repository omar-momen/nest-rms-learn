import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('app.corsOrigin');

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : true,
    credentials: true,
  });
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Listen for SIGTERM/SIGINT so Nest runs destroy hooks (e.g. Prisma `$disconnect`)
  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT', 3000));
}
void bootstrap();
