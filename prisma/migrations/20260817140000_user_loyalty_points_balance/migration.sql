-- AlterTable
ALTER TABLE "User" ADD COLUMN "loyaltyPointsBalance" INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing ledger rows
UPDATE "User" AS u
SET "loyaltyPointsBalance" = COALESCE((
  SELECT SUM(lt."points") FROM "LoyaltyTransaction" AS lt WHERE lt."userId" = u.id
), 0);

-- AddCheck
ALTER TABLE "User"
ADD CONSTRAINT "User_loyaltyPointsBalance_nonnegative_check"
CHECK ("loyaltyPointsBalance" >= 0);
