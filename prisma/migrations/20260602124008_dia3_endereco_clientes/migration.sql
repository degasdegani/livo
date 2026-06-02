/*
  Warnings:

  - You are about to drop the `invitations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `memberships` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cpf]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ClientOrigem" AS ENUM ('Indicacao', 'Google', 'Instagram', 'Fachada', 'Outro');

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_barbershopId_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_barbershopId_fkey";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_barbershopId_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_userId_fkey";

-- DropIndex
DROP INDEX "waitlist_leads_source_idx";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "endTime" DROP NOT NULL,
ALTER COLUMN "clientPhone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "street" TEXT;

-- AlterTable
ALTER TABLE "business_hours" ALTER COLUMN "openTime" SET DEFAULT '09:00',
ALTER COLUMN "closeTime" SET DEFAULT '18:00';

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "origem" "ClientOrigem",
ADD COLUMN     "street" TEXT;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "durationMin" SET DEFAULT 30,
ALTER COLUMN "priceInCents" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "cpf" TEXT,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "waitlist_leads" ALTER COLUMN "source" SET DEFAULT 'vip';

-- DropTable
DROP TABLE "invitations";

-- DropTable
DROP TABLE "memberships";

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "professionalId" TEXT,
    "commissionOnServices" BOOLEAN NOT NULL DEFAULT true,
    "commissionOnProducts" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "professionalId" TEXT,
    "commissionOnServices" BOOLEAN NOT NULL DEFAULT true,
    "commissionOnProducts" BOOLEAN NOT NULL DEFAULT false,
    "barbershopId" TEXT NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_professionalId_key" ON "Membership"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_barbershopId_key" ON "Membership"("userId", "barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
