import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'node:path';

import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';

// Config
import { ConfigModule, type ConfigType } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  environmentValidationSchema,
  mailConfig,
  redisConfig,
} from '@/config';

import { AllExceptionsFilter, PrismaExceptionFilter } from '@/common/filters';

import { DataResponseInterceptor } from '@/common/interceptors';

import { RequestLoggingMiddleware } from '@/common/middleware';

// Modules
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { HealthModule } from '@/modules/health/health.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CartsModule } from '@/modules/carts/carts.module';
import { UsersModule } from '@/modules/users/users.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { BranchesModule } from '@/modules/branches/branches.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { LoyaltyTransactionsModule } from '@/modules/loyalty-transactions/loyalty-transactions.module';
import { InventoriesModule } from '@/modules/inventories/inventories.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CacheModule } from '@/modules/cache/cache.module';

// JWT
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';

// Throttler
import { appThrottlerOptions } from '@/common/throttler';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { EventEmitterModule } from '@nestjs/event-emitter';

// Queues
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

// Environment
const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV ? `.env.${ENV}` : '.env',
      load: [appConfig, databaseConfig, mailConfig, redisConfig],
      validationSchema: environmentValidationSchema,
      expandVariables: true,
    }),

    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'ar-*': 'ar',
        'en-*': 'en',
      },
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),

    ThrottlerModule.forRoot(appThrottlerOptions),

    EventEmitterModule.forRoot(),

    // Shared Redis connection for all BullMQ queues registered later.
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: redis.host,
          port: redis.port,
        },
      }),
    }),

    // Bull Board dashboard at /queues. It has no auth, so it is development only.
    // Queues opt in with BullBoardModule.forFeature() in their own module.
    ...(ENV === 'development'
      ? [BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter })]
      : []),

    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env
          .JWT_ACCESS_EXPIRES_IN as JwtSignOptions['expiresIn'],
      },
    }),

    PrismaModule,
    CacheModule,
    HealthModule,
    CategoriesModule,
    ProductsModule,
    CartsModule,
    UsersModule,
    OrdersModule,
    AuthModule,
    AddressesModule,
    BranchesModule,
    CouponsModule,
    LoyaltyTransactionsModule,
    InventoriesModule,
    NotificationsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DataResponseInterceptor,
    },
    // Nest resolves APP_FILTER providers in reverse registration order, so the
    // catch-all goes first and the narrower Prisma filter wins when it matches.
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*path');
  }
}
