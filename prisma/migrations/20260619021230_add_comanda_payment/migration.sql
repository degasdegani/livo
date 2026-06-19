-- AlterTable
ALTER TABLE "barbershops" ADD COLUMN     "reopenPin" TEXT;

-- CreateTable
CREATE TABLE "comanda_payments" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_payments_comandaId_idx" ON "comanda_payments"("comandaId");

-- AddForeignKey
ALTER TABLE "comanda_payments" ADD CONSTRAINT "comanda_payments_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
