import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

// Config
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  environmentValidationSchema,
} from './config';

// Modules
import { PrismaModule } from './prisma.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductsModule } from './modules/products/products.module';

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
    CategoryModule,
    ProductsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
