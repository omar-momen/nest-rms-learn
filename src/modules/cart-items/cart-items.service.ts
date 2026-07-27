import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { ProductResponseDto } from '../products/dto';

import {
  CartItemResponseDto,
  CreateCartItemDto,
  UpdateCartItemDto,
} from './dto';

@Injectable()
export class CartItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async create(data: CreateCartItemDto): Promise<CartItemResponseDto> {
    const product = await this.productsService.findOne(data.productId);
    if (!product.isAvailable) {
      throw new BadRequestException(`Product ${data.productId} is unavailable`);
    }

    return this.prisma.cartItem.create({ data });
  }

  findAll(): Promise<CartItemResponseDto[]> {
    return this.prisma.cartItem.findMany();
  }

  findManyInCart(
    cartId: string,
  ): Promise<(CartItemResponseDto & { product: ProductResponseDto })[]> {
    return this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: true },
    });
  }

  async findOne(id: string): Promise<CartItemResponseDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }
    return cartItem;
  }

  findOneByCartIdAndProductId(
    cartId: string,
    productId: string,
  ): Promise<CartItemResponseDto | null> {
    return this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  }

  async update(
    id: string,
    data: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    // TODO: Get the user id from the request context
    const userId = '7c78714d-d603-4a57-bdfa-8fd4946a0408';

    // Check if the cart item belongs to the user
    const cartItem = await this.findOne(id);
    if (cartItem.cart?.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this cart item',
      );
    }

    return this.prisma.cartItem.update({ where: { id }, data });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    await this.prisma.cartItem.delete({ where: { id } });
    return { message: 'Cart item deleted successfully' };
  }

  /** Deletes cart items whose productId is not in `productIds`. Empty list clears the cart. */
  async removeNotInProducts(
    cartId: string,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId } });
      return;
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId, productId: { notIn: productIds } },
    });
  }
}
