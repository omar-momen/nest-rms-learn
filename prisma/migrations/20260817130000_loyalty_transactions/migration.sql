-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_userId_idx" ON "LoyaltyTransaction"("userId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks: sign of points must match type
ALTER TABLE "LoyaltyTransaction"
ADD CONSTRAINT "LoyaltyTransaction_earn_positive_check"
CHECK ("type" != 'EARN' OR "points" > 0),
ADD CONSTRAINT "LoyaltyTransaction_redeem_negative_check"
CHECK ("type" != 'REDEEM' OR "points" < 0),
ADD CONSTRAINT "LoyaltyTransaction_adjust_nonzero_check"
CHECK ("type" != 'ADJUST' OR "points" != 0);
