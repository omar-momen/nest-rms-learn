-- Product money must not be negative.
ALTER TABLE "Product"
ADD CONSTRAINT "Product_price_nonnegative_check"
CHECK ("price" >= 0);

-- Cart lines must always contain at least one item.
ALTER TABLE "CartItem"
ADD CONSTRAINT "CartItem_quantity_positive_check"
CHECK ("quantity" > 0);

-- Persisted order amounts and line values must not be negative.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_loyaltyPointsAmount_nonnegative_check"
CHECK ("loyaltyPointsAmount" IS NULL OR "loyaltyPointsAmount" >= 0),
ADD CONSTRAINT "Order_total_nonnegative_check"
CHECK ("total" >= 0),
ADD CONSTRAINT "Order_discount_nonnegative_check"
CHECK ("discount" >= 0),
ADD CONSTRAINT "Order_tax_nonnegative_check"
CHECK ("tax" >= 0),
ADD CONSTRAINT "Order_subtotal_nonnegative_check"
CHECK ("subtotal" >= 0),
ADD CONSTRAINT "Order_discount_not_above_subtotal_check"
CHECK ("discount" <= "subtotal");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_quantity_positive_check"
CHECK ("quantity" > 0),
ADD CONSTRAINT "OrderItem_unitPrice_nonnegative_check"
CHECK ("unitPrice" >= 0);
