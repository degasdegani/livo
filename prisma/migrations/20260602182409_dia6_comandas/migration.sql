-- CreateEnum
CREATE TYPE "ComandaStatus" AS ENUM ('open', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'pix', 'credit_card', 'debit_card', 'voucher');

-- CreateEnum
CREATE TYPE "ComandaItemType" AS ENUM ('service', 'product');

-- CreateTable
CREATE TABLE "comandas" (
    "id" TEXT NOT NULL,
    "status" "ComandaStatus" NOT NULL DEFAULT 'open',
    "paymentMethod" "PaymentMethod",
    "clientId" TEXT,
    "clientName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "totalInCents" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "barbershopId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_items" (
    "id" TEXT NOT NULL,
    "type" "ComandaItemType" NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL DEFAULT '',
    "servicePrice" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT,
    "productName" TEXT NOT NULL DEFAULT '',
    "productPrice" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "unitPriceInCents" INTEGER NOT NULL,
    "totalInCents" INTEGER NOT NULL,
    "commissionPct" DECIMAL(5,2),
    "commissionValue" INTEGER,
    "comandaId" TEXT NOT NULL,

    CONSTRAINT "comanda_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comandas_appointmentId_key" ON "comandas"("appointmentId");

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
