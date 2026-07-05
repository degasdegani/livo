-- CreateEnum
CREATE TYPE "PackagePaymentStatus" AS ENUM ('pending', 'paid');

-- AlterTable
ALTER TABLE "comanda_items" ADD COLUMN     "clientPackageId" TEXT;

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInCents" INTEGER NOT NULL,
    "validityDays" INTEGER,
    "commissionPercent" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_packages" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "paymentStatus" "PackagePaymentStatus" NOT NULL DEFAULT 'pending',
    "priceInCents" INTEGER NOT NULL,
    "paymentDueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "soldByProfessionalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_package_items" (
    "id" TEXT NOT NULL,
    "clientPackageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "quantityTotal" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "client_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packages_barbershopId_idx" ON "packages"("barbershopId");

-- CreateIndex
CREATE INDEX "package_items_packageId_idx" ON "package_items"("packageId");

-- CreateIndex
CREATE INDEX "client_packages_barbershopId_idx" ON "client_packages"("barbershopId");

-- CreateIndex
CREATE INDEX "client_packages_clientId_idx" ON "client_packages"("clientId");

-- CreateIndex
CREATE INDEX "client_package_items_clientPackageId_idx" ON "client_package_items"("clientPackageId");

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_clientPackageId_fkey" FOREIGN KEY ("clientPackageId") REFERENCES "client_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_soldByProfessionalId_fkey" FOREIGN KEY ("soldByProfessionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_package_items" ADD CONSTRAINT "client_package_items_clientPackageId_fkey" FOREIGN KEY ("clientPackageId") REFERENCES "client_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_package_items" ADD CONSTRAINT "client_package_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
