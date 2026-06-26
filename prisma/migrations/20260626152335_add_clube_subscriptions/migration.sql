-- CreateEnum
CREATE TYPE "ClientSubscriptionStatus" AS ENUM ('pending', 'active', 'suspended', 'cancelled');

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "clubAsaasAccountStatus" TEXT,
ADD COLUMN     "clubAsaasWalletId" TEXT;

-- CreateTable
CREATE TABLE "client_subscriptions" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "ClientSubscriptionStatus" NOT NULL DEFAULT 'pending',
    "asaasSubscriptionId" TEXT,
    "soldByProfessionalId" TEXT,
    "startedAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastBillingEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usages" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "subscription_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_subscriptions_asaasSubscriptionId_key" ON "client_subscriptions"("asaasSubscriptionId");

-- CreateIndex
CREATE INDEX "client_subscriptions_barbershopId_idx" ON "client_subscriptions"("barbershopId");

-- CreateIndex
CREATE INDEX "client_subscriptions_clientId_idx" ON "client_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "subscription_usages_subscriptionId_idx" ON "subscription_usages"("subscriptionId");

-- AddForeignKey
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_subscriptions" ADD CONSTRAINT "client_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
