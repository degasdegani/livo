-- P0.4: Convert planStatus TEXT → PlanStatus enum
-- Uses USING cast to preserve existing data without data loss.
-- Existing values in production: trial, active, lifetime

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('trial', 'active', 'suspended', 'cancelled', 'lifetime');

-- AlterTable: safe type conversion preserving all existing rows
ALTER TABLE "barbershops" ALTER COLUMN "planStatus" DROP DEFAULT;
ALTER TABLE "barbershops" ALTER COLUMN "planStatus" TYPE "PlanStatus" USING "planStatus"::"PlanStatus";
ALTER TABLE "barbershops" ALTER COLUMN "planStatus" SET DEFAULT 'trial';
