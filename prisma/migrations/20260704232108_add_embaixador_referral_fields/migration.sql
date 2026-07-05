-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "customMonthlyPriceInCents" INTEGER,
ADD COLUMN     "firstPaymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "freeMonthCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEmbaixador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredByBarbershopId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "barbershops_referralCode_key" ON "barbershops"("referralCode");

-- AddForeignKey
ALTER TABLE "barbershops" ADD CONSTRAINT "barbershops_referredByBarbershopId_fkey" FOREIGN KEY ("referredByBarbershopId") REFERENCES "barbershops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
