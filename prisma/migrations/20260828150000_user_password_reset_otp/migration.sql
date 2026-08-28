-- DropIndex
DROP INDEX "User_passwordResetTokenHash_key";

-- AlterTable
ALTER TABLE "User" RENAME COLUMN "passwordResetTokenHash" TO "passwordResetOtpHash";
