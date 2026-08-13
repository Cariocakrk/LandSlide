-- AlterTable
ALTER TABLE "User" ADD COLUMN "twoFactorCode" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorExpires" DATETIME;
