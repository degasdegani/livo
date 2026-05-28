/*
  Warnings:

  - You are about to drop the column `address` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `planExpiresAt` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColor` on the `barbershops` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `barbershops` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "barbershops" DROP COLUMN "address",
DROP COLUMN "description",
DROP COLUMN "logoUrl",
DROP COLUMN "planExpiresAt",
DROP COLUMN "primaryColor",
DROP COLUMN "zipCode",
ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "asaasSubscriptionId" TEXT,
ADD COLUMN     "planStatus" TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
