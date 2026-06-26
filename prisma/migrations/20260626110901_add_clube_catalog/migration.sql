-- CreateEnum
CREATE TYPE "BarberCommissionMode" AS ENUM ('fixed', 'none');

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "clubEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInCents" INTEGER NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "barberCommissionMode" "BarberCommissionMode" NOT NULL DEFAULT 'none',
    "platformFeePct" DOUBLE PRECISION,
    "maxSlots" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantityPerCycle" INTEGER NOT NULL DEFAULT 1,
    "barberCommissionInCents" INTEGER,

    CONSTRAINT "subscription_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_product_discounts" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountPct" DOUBLE PRECISION,
    "discountInCents" INTEGER,

    CONSTRAINT "subscription_plan_product_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_plans_barbershopId_idx" ON "subscription_plans"("barbershopId");

-- CreateIndex
CREATE INDEX "subscription_plan_items_planId_idx" ON "subscription_plan_items"("planId");

-- CreateIndex
CREATE INDEX "subscription_plan_product_discounts_planId_idx" ON "subscription_plan_product_discounts"("planId");

-- AddForeignKey
ALTER TABLE "subscription_plan_items" ADD CONSTRAINT "subscription_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_items" ADD CONSTRAINT "subscription_plan_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_product_discounts" ADD CONSTRAINT "subscription_plan_product_discounts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_product_discounts" ADD CONSTRAINT "subscription_plan_product_discounts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
