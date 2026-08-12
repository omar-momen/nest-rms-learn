-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE');

-- AlterTable: coerce free-text values into the enum (unknown → CASH)
ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
  USING (
    CASE upper("paymentMethod")
      WHEN 'CASH' THEN 'CASH'::"PaymentMethod"
      WHEN 'CARD' THEN 'CARD'::"PaymentMethod"
      WHEN 'ONLINE' THEN 'ONLINE'::"PaymentMethod"
      ELSE 'CASH'::"PaymentMethod"
    END
  );
