export class CartSummaryDto {
  /** Fixed 2-decimal money strings */
  total: string;
  subtotal: string;
  discount: string;
  tax: string;
}
