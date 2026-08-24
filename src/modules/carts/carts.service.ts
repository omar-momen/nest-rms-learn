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
import { InventoriesService } from '@/modules/inventories/inventories.service';

import {
  CartResponseDto,
  CartItemInputDto,
  CreateCartDto,
  UpdateCartDto,
  ValidateCartDto,
} from './dto';

import {
  assertCheckoutFulfillment,
  assertUserOwnsCartOrOrder,
  assessCartItems,
  calculateCartSummary,
} from '@/utils/cart-order-flow';
import { serializeMoney } from '@/utils/money.util';

@Injectable({ scope: Scope.REQUEST })
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly inventoriesService: InventoriesService,
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

  async findOne(
    includeItems: boolean = false,
    branchId?: string,
  ): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      include: { cartItems: { include: { product: true } } },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (!includeItems) {
      return {
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
    }

    const stockByProductId = branchId
      ? await this.inventoriesService.getQuantitiesByProductId(
          branchId,
          cart.cartItems.map((item) => item.productId),
        )
      : undefined;

    return this.toAssessedResponse(cart, stockByProductId);
  }

  async update(updateCartDto: UpdateCartDto): Promise<CartResponseDto> {
    const cart = await this.findCurrentUserCart();

    assertUserOwnsCartOrOrder(this.userId, cart.userId);

    if (updateCartDto.items !== undefined) {
      await this.replaceItems(cart.id, updateCartDto.items);
    }

    return this.findOne(true);
  }

  async remove(): Promise<{ message: string }> {
    const cart = await this.findCurrentUserCart();

    assertUserOwnsCartOrOrder(this.userId, cart.userId);

    await this.prisma.cart.delete({ where: { userId: this.userId } });
    return { message: 'Cart deleted successfully' };
  }

  async validateCart(
    validateCartDto: ValidateCartDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findCurrentUserCart();

    assertUserOwnsCartOrOrder(this.userId, cart.userId);

    // TODO: loyalty points / payment; compute tax
    const { type, addressId, branchId, couponCode } = validateCartDto;

    // findCurrentUserCart → toAssessedResponse already computed pre-coupon totals
    const orderAmount = cart.summary?.subtotal ?? '0.00';

    const { coupon } = await assertCheckoutFulfillment(
      this.prisma,
      {
        userId: this.userId,
        type,
        branchId,
        addressId,
        couponCode,
      },
      orderAmount,
      'cart',
    );

    const stockByProductId =
      await this.inventoriesService.getQuantitiesByProductId(
        branchId,
        (cart.cartItems ?? []).map((item) => item.productId),
      );

    const assessment = assessCartItems(cart.cartItems ?? [], stockByProductId);
    if (!assessment.valid) {
      throw new BadRequestException({
        message: 'Cart has invalid items',
        issues: assessment.issues,
      });
    }

    return {
      ...cart,
      ...assessment,
      summary: calculateCartSummary(cart.cartItems ?? [], coupon),
    };
  }

  private toAssessedResponse(
    cart: Prisma.CartGetPayload<{
      include: { cartItems: { include: { product: true } } };
    }>,
    stockByProductId?: Map<string, number>,
  ): CartResponseDto {
    const cartItems = (cart.cartItems ?? []).map((item) => ({
      ...item,
      product: {
        ...item.product,
        price: serializeMoney(item.product.price),
      },
    }));

    const assessment = assessCartItems(cartItems, stockByProductId);

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

  // ============ PRIVATE METHODS ============

  private async findCurrentUserCart(): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      include: { cartItems: { include: { product: true } } },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.toAssessedResponse(cart);
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
