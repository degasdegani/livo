-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "tvPin" TEXT;

-- CreateTable
CREATE TABLE "barbershop_goals" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "period" "GoalPeriod" NOT NULL,
    "targetInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barbershop_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_goals" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "period" "GoalPeriod" NOT NULL,
    "targetServices" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_devices" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tv_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barbershop_goals_barbershopId_idx" ON "barbershop_goals"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "barbershop_goals_barbershopId_period_key" ON "barbershop_goals"("barbershopId", "period");

-- CreateIndex
CREATE INDEX "professional_goals_barbershopId_idx" ON "professional_goals"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_goals_professionalId_period_key" ON "professional_goals"("professionalId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "tv_devices_token_key" ON "tv_devices"("token");

-- CreateIndex
CREATE INDEX "tv_devices_barbershopId_idx" ON "tv_devices"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "barbershops_tvPin_key" ON "barbershops"("tvPin");
