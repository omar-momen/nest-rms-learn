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
  CartResponseDto,
  CartItemInputDto,
  CartItemIssueDto,
  CartItemIssueCode,
  CreateCartDto,
  UpdateCartDto,
  ValidateCartDto,
} from './dto';

import { CartItemsService } from '../cart-items/cart-items.service';
import { CartItemResponseDto } from '../cart-items/dto';
import { CartSummaryDto } from './dto/cart-summary.dto';

type CartItemWithProduct = CartItemResponseDto & {
  product?: ProductResponseDto | null;
};

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartItemsService: CartItemsService,
    private readonly productsService: ProductsService,
  ) {}

  async create(createCartDto: CreateCartDto): Promise<CartResponseDto> {
    const userId = '7c78714d-d603-4a57-bdfa-8fd4946a0408'; // TODO: Get the user id from the request body

    const cart =
      (await this.prisma.cart.findUnique({ where: { userId: userId } })) ??
      (await this.prisma.cart.create({ data: { userId: userId } }));

    if (createCartDto.items !== undefined) {
      await this.replaceItems(cart.id, createCartDto.items);
    }

    return this.findOne(cart.id, true);
  }

  findAll(): Promise<CartResponseDto[]> {
    return this.prisma.cart.findMany({});
  }

  async findOne(
    id: string,
    includeItems: boolean = false,
  ): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        ...(includeItems ? { cartItems: { include: { product: true } } } : {}),
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // if items are not included, return the cart without the assessment and summary
    if (!includeItems) {
      return cart;
    }

    // Assess the items
    const assessment = this.assessItems(cart.cartItems ?? []);

    return {
      ...cart,
      ...assessment,
      summary: await this.calculateSummary(id),
    };
  }

  async update(
    id: string,
    updateCartDto: UpdateCartDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findOne(id);

    const userId = '7c78714d-d603-4a57-bdfa-8fd4946a0408'; // TODO: Get the user id from the request body

    this.isUserOwnerOfCart(userId, cart.userId);

    if (updateCartDto.items !== undefined) {
      await this.replaceItems(id, updateCartDto.items);
    }

    return this.findOne(id, true);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    await this.prisma.cart.delete({ where: { id } });
    return { message: 'Cart deleted successfully' };
  }

  async validateCart(
    id: string,
    validateCartDto?: ValidateCartDto,
  ): Promise<CartResponseDto> {
    const cart = await this.findOne(id, true);

    const userId = '7c78714d-d603-4a57-bdfa-8fd4946a0408'; // TODO: Get the user id from the request context

    this.isUserOwnerOfCart(userId, cart.userId);

    const { couponCode, loyaltyPointsAmount, address, paymentMethod } =
      validateCartDto ?? {};

    console.log(couponCode, loyaltyPointsAmount, address, paymentMethod);

    // TODO: validate the coupon
    // TODO: validate the loyalty points
    // TODO: validate the address
    // TODO: validate the payment method

    // Assess the items
    const assessment = this.assessItems(cart.cartItems ?? []);
    if (!assessment.valid) {
      throw new BadRequestException({
        message: 'Cart has invalid items',
        issues: assessment.issues,
      });
    }

    return {
      ...cart,
      ...assessment,
      summary: await this.calculateSummary(id, couponCode, loyaltyPointsAmount),
    };
  }

  /** Soft item health check — does not throw. */
  private assessItems(cartItems: CartItemWithProduct[]): {
    valid: boolean;
    issues: CartItemIssueDto[];
  } {
    const issues: CartItemIssueDto[] = [];

    if (cartItems.length === 0) {
      issues.push({
        cartItemId: '',
        productId: '',
        code: CartItemIssueCode.EMPTY_CART,
        message: 'Cart is empty',
      });
      return { valid: false, issues };
    }

    for (const item of cartItems) {
      if (!item.product?.isAvailable) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          code: CartItemIssueCode.UNAVAILABLE,
          message: 'Product is unavailable',
        });
        continue;
      }

      if (item.quantity < 1) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          code: CartItemIssueCode.INVALID_QUANTITY,
          message: 'Quantity must be at least 1',
        });
      }

      if (+item.product.price <= 0) {
        issues.push({
          cartItemId: item.id,
          productId: item.productId,
          code: CartItemIssueCode.INVALID_PRICE,
          message: 'Product price is invalid',
        });
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /** Replaces full cart contents (omit = remove). */
  private async replaceItems(
    cartId: string,
    items: CartItemInputDto[],
  ): Promise<void> {
    // TODO: wrap in a transaction

    // Check for duplicate productIds
    const productIds = items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate productId in items');
    }

    // Check if products exist and are available
    for (const productId of productIds) {
      const product = await this.productsService.findOne(productId);
      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${productId} is unavailable`);
      }
    }

    // Remove cart items that are not in the products
    await this.cartItemsService.removeNotInProducts(cartId, productIds);

    // Create or update cart items
    for (const item of items) {
      const cartItem = await this.cartItemsService.findOneByCartIdAndProductId(
        cartId,
        item.productId,
      );

      if (cartItem) {
        // Update the cart item quantity
        await this.cartItemsService.update(cartItem.id, {
          quantity: item.quantity,
        });
      } else {
        // Create a new cart item
        await this.cartItemsService.create({
          cartId,
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }
  }

  private async calculateSummary(
    cartId: string,
    couponCode?: string,
    loyaltyPoints?: number,
  ): Promise<CartSummaryDto> {
    const cartItems = await this.cartItemsService.findManyInCart(cartId);

    console.log(couponCode, loyaltyPoints);

    const subtotal = cartItems.reduce(
      (acc, item) => acc + +item.product.price * item.quantity,
      0,
    );

    // TODO: Calculate the discount
    const discount = 0;

    // TODO: Calculate the tax
    const tax = 0;

    const total = subtotal - discount + tax;

    const summary: CartSummaryDto = {
      total,
      subtotal,
      discount,
      tax,
    };

    return summary;
  }

  private isUserOwnerOfCart(userId: string, cartUserId: string): boolean {
    if (cartUserId !== userId) {
      throw new ForbiddenException('This cart does not belong to you');
    }

    return true;
  }
}
