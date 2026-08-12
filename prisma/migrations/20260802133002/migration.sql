-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'PICKUP', 'CURBSIDE', 'DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'DELIVERY';
