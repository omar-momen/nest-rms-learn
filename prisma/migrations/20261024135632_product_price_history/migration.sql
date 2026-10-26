-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_changedAt_idx" ON "ProductPriceHistory"("productId", "changedAt");

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written below: Prisma schema cannot express functions or triggers.

-- CreateFunction
-- Records one price change. OLD is the row before the UPDATE, NEW the row
-- after it, so together they give the old and new price of this product.
-- The id is generated here because @default(uuid()) only runs in Prisma
-- Client; the column has no database default. changedAt uses its default.
CREATE FUNCTION "log_product_price_change"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "ProductPriceHistory" ("id", "productId", "oldPrice", "newPrice")
    VALUES (gen_random_uuid()::text, NEW."id", OLD."price", NEW."price");

    -- The return value of an AFTER trigger is ignored.
    RETURN NULL;
END;
$$;

-- CreateTrigger
-- AFTER: the trigger only records history and never changes the row, and it
-- sees the price that was actually written. It runs inside the same
-- transaction as the UPDATE, so a rollback removes the history row too.
-- UPDATE OF "price" fires whenever "price" is in the SET list, even when the
-- value is unchanged; the WHEN clause skips those no-op updates.
CREATE TRIGGER "Product_price_history_trigger"
AFTER UPDATE OF "price" ON "Product"
FOR EACH ROW
WHEN (OLD."price" IS DISTINCT FROM NEW."price")
EXECUTE FUNCTION "log_product_price_change"();
