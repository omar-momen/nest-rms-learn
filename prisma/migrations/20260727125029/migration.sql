/*
  Warnings:

  - Added the required column `discount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address" TEXT,
ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "discount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "loyaltyPointsAmount" DECIMAL(65,30),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "tax" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "total" DECIMAL(65,30) NOT NULL;
