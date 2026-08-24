export enum CartItemIssueCode {
  EMPTY_CART = 'EMPTY_CART',
  UNAVAILABLE = 'UNAVAILABLE',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_PRICE = 'INVALID_PRICE',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
}

export class CartItemIssueDto {
  cartItemId: string;
  productId: string;
  code: CartItemIssueCode;
  message: string;
}
