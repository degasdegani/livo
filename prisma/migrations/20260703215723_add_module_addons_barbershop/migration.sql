-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "moduleAddOns" TEXT[] DEFAULT ARRAY[]::TEXT[];
