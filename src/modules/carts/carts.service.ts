import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';
import { ProductsService } from '../products/products.service';

import {
  CartResponseDto,
  CartItemInputDto,
  CreateCartDto,
  UpdateCartDto,
  ValidateCartDto,
} from './dto';

import { assertUserOwnsCartOrOrder } from './utils/cart-ownership.util';
import { assessCartItems } from './utils/cart-assessment.util';
import { calculateCartSummary } from './utils/cart-summary.util';
import { assertCheckoutFulfillment } from './utils/checkout-validation.util';
import { serializeMoney } from '@/utils/money.util';

@Injectable({ scope: Scope.REQUEST })
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  private get userId(): string {
    return this.request.user.sub;
  }

  async create(createCartDto: CreateCartDto): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.upsert({
      where: { userId: this.userId },
      update: {},
      create: { userId: this.userId },
    });

    if (createCartDto.items !== undefined) {
      await this.replaceItems(cart.id, createCartDto.items);
    }

    return this.findOne(true);
  }

  async findOne(includeItems: boolean = false): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      include: { cartItems: { include: { product: true } } },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    assertUserOwnsCartOrOrder(this.userId, cart.userId);

    if (!includeItems) {
      return {
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
    }

    return this.toAssessedResponse(cart);
  }

  async update(updateCartDto: UpdateCartDto): Promise<CartResponseDto> {
    const cart = await this.findCurrentUserCart();

    if (updateCartDto.items !== undefined) {
      await this.replaceItems(cart.id, updateCartDto.items);
    }

    return this.findOne(true);
  }

  async remove(): Promise<{ message: string }> {
    await this.findOne();

    await this.prisma.cart.delete({ where: { userId: this.userId } });
    return { message: 'Cart deleted successfully' };
  }

  async validateCart(
    validateCartDto: ValidateCartDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findCurrentUserCart(true);

    assertUserOwnsCartOrOrder(this.userId, cart.userId);

    // TODO: apply coupon / loyalty points / payment; compute discount & tax

    const { type, addressId, branchId } = validateCartDto;

    await assertCheckoutFulfillment(this.prisma, {
      userId: this.userId,
      type,
      branchId,
      addressId,
    });

    const assessment = assessCartItems(cart.cartItems ?? []);
    if (!assessment.valid) {
      throw new BadRequestException({
        message: 'Cart has invalid items',
        issues: assessment.issues,
      });
    }

    return { ...cart, ...assessment };
  }

  // ============ PRIVATE METHODS ============

  private async findCurrentUserCart(
    includeItems: boolean = false,
  ): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      select: { id: true },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.findOne(includeItems);
  }

  private toAssessedResponse(
    cart: Prisma.CartGetPayload<{
      include: { cartItems: { include: { product: true } } };
    }>,
  ): CartResponseDto {
    const cartItems = (cart.cartItems ?? []).map((item) => ({
      ...item,
      product: {
        ...item.product,
        price: serializeMoney(item.product.price),
      },
    }));

    const assessment = assessCartItems(cartItems);

    return {
      id: cart.id,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      cartItems,
      ...assessment,
      summary: calculateCartSummary(cart.cartItems ?? []),
    };
  }

  private async replaceItems(
    cartId: string,
    items: CartItemInputDto[],
  ): Promise<void> {
    // Validate For Duplicate productId
    const productIds = items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate productId in items');
    }

    // Validate For Unavailable Products
    for (const productId of productIds) {
      const product = await this.productsService.findOne(productId);
      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${productId} is unavailable`);
      }
    }

    // Replace Items
    await this.prisma.$transaction(async (tx) => {
      if (productIds.length === 0) {
        await tx.cartItem.deleteMany({ where: { cartId } });
        return;
      }

      await tx.cartItem.deleteMany({
        where: { cartId, productId: { notIn: productIds } },
      });

      for (const item of items) {
        await tx.cartItem.upsert({
          where: {
            cartId_productId: { cartId, productId: item.productId },
          },
          create: {
            cartId,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: { quantity: item.quantity },
        });
      }
    });
  }
}
