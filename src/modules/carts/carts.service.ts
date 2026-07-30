import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { DEV_CURRENT_USER_ID } from '@/constants/dev-current-user';

import { ProductsService } from '../products/products.service';

import {
  CartResponseDto,
  CartItemInputDto,
  CreateCartDto,
  UpdateCartDto,
  ValidateCartDto,
  CartSummaryDto,
} from './dto';

import { assertUserOwnsCartOrOrder } from './utils/cart-ownership.util';
import { assessCartItems } from './utils/cart-assessment.util';
import {
  multiplyMoney,
  serializeMoney,
  sumMoney,
  toDecimal,
} from '@/utils/money.util';

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async create(createCartDto: CreateCartDto): Promise<CartResponseDto> {
    const userId = DEV_CURRENT_USER_ID;

    const cart =
      (await this.prisma.cart.findUnique({ where: { userId } })) ??
      (await this.prisma.cart.create({ data: { userId } }));

    if (createCartDto.items !== undefined) {
      await this.replaceItems(cart.id, createCartDto.items);
    }

    return this.findOne(cart.id, true);
  }

  async findAll(): Promise<CartResponseDto[]> {
    const carts = await this.prisma.cart.findMany({
      include: { cartItems: { include: { product: true } } },
    });

    return carts.map((cart) => this.toAssessedResponse(cart));
  }

  async findOne(
    id: string,
    includeItems: boolean = false,
  ): Promise<CartResponseDto> {
    if (!includeItems) {
      const cart = await this.prisma.cart.findUnique({ where: { id } });
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      return {
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: { cartItems: { include: { product: true } } },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.toAssessedResponse(cart);
  }

  async update(updateCartDto: UpdateCartDto): Promise<CartResponseDto> {
    const cartId = '00000000-0000-0000-0000-000000000000'; // TODO: resolve cartId from current user

    const cart = await this.findOne(cartId);
    assertUserOwnsCartOrOrder(DEV_CURRENT_USER_ID, cart.userId);

    if (updateCartDto.items !== undefined) {
      await this.replaceItems(cartId, updateCartDto.items);
    }

    return this.findOne(cartId, true);
  }

  async remove(id: string): Promise<{ message: string }> {
    const cart = await this.findOne(id);
    assertUserOwnsCartOrOrder(DEV_CURRENT_USER_ID, cart.userId);

    await this.prisma.cart.delete({ where: { id } });
    return { message: 'Cart deleted successfully' };
  }

  async validateCart(
    validateCartDto?: ValidateCartDto,
  ): Promise<CartResponseDto> {
    const cartId = '00000000-0000-0000-0000-000000000000'; // TODO: resolve cartId from current user

    const cart = await this.findOne(cartId, true);
    assertUserOwnsCartOrOrder(DEV_CURRENT_USER_ID, cart.userId);

    // TODO: apply couponCode / loyaltyPointsAmount / address / paymentMethod
    void validateCartDto;

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
      summary: this.summaryFromItems(cart.cartItems ?? []),
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

  summaryFromItems(
    cartItems: Array<{
      quantity: number;
      product: { price: Prisma.Decimal | string | number };
    }>,
  ): CartSummaryDto {
    const subtotal = sumMoney(
      cartItems.map((item) => multiplyMoney(item.product.price, item.quantity)),
    );
    // TODO: discount / tax from coupon & loyalty
    const discount = toDecimal(0);
    const tax = toDecimal(0);
    const total = subtotal.sub(discount).add(tax);

    return {
      total: serializeMoney(total),
      subtotal: serializeMoney(subtotal),
      discount: serializeMoney(discount),
      tax: serializeMoney(tax),
    };
  }
}
