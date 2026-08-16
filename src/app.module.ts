import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from '@/app.controller';

// Config
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  environmentValidationSchema,
} from '@/config';
import { AllExceptionsFilter, PrismaExceptionFilter } from '@/common/filters';
import { DataResponseInterceptor } from '@/common/interceptors';
import { RequestLoggingMiddleware } from '@/common/middleware';
import { throttlers } from '@/common/throttler';

// Modules
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CartsModule } from '@/modules/carts/carts.module';
import { UsersModule } from '@/modules/users/users.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { BranchesModule } from '@/modules/branches/branches.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { HealthModule } from '@/modules/health/health.module';

// Libraries
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV ? `.env.${ENV}` : '.env',
      load: [appConfig, databaseConfig],
      validationSchema: environmentValidationSchema,
      expandVariables: true,
    }),

    ThrottlerModule.forRoot(throttlers),

    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env
          .JWT_ACCESS_EXPIRES_IN as JwtSignOptions['expiresIn'],
      },
    }),

    PrismaModule,
    CategoriesModule,
    ProductsModule,
    CartsModule,
    UsersModule,
    OrdersModule,
    AuthModule,
    AddressesModule,
    BranchesModule,
    CouponsModule,
    HealthModule,
  ],

  controllers: [AppController],

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
