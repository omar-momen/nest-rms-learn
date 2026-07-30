import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';

// Config
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  environmentValidationSchema,
} from '@/config';

// Modules
import { PrismaModule } from '@/prisma/prisma.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ProductsModule } from '@/modules/products/products.module';
import { CartsModule } from '@/modules/carts/carts.module';
import { UsersModule } from '@/modules/users/users.module';
import { OrdersModule } from '@/modules/orders/orders.module';

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
    PrismaModule,
    CategoriesModule,
    ProductsModule,
    CartsModule,
    UsersModule,
    OrdersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
