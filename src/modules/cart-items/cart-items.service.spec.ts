import { Test, TestingModule } from '@nestjs/testing';
import { CartItemsService } from './cart-items.service';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('CartItemsService', () => {
  let service: CartItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartItemsService,
        { provide: PrismaService, useValue: {} },
        { provide: ProductsService, useValue: {} },
      ],
    }).compile();

    service = module.get<CartItemsService>(CartItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
