-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RESTOCK', 'ADJUST', 'ORDER_DECREMENT', 'ORDER_RESTORE');

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_productId_branchId_key" ON "ProductInventory"("productId", "branchId");

-- CreateIndex
CREATE INDEX "ProductInventory_branchId_idx" ON "ProductInventory"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_orderId_productId_type_key" ON "InventoryTransaction"("orderId", "productId", "type");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_branchId_idx" ON "InventoryTransaction"("productId", "branchId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orderId_idx" ON "InventoryTransaction"("orderId");

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductInventory"
ADD CONSTRAINT "ProductInventory_quantity_nonnegative_check"
CHECK ("quantity" >= 0);

ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_quantityDelta_nonzero_check"
CHECK ("quantityDelta" <> 0);
