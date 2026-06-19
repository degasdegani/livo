-- CreateTable
CREATE TABLE "professional_service_commissions" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "professional_service_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_product_commissions" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "professional_product_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_service_commissions_professionalId_serviceId_key" ON "professional_service_commissions"("professionalId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_product_commissions_professionalId_productId_key" ON "professional_product_commissions"("professionalId", "productId");

-- AddForeignKey
ALTER TABLE "professional_service_commissions" ADD CONSTRAINT "professional_service_commissions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_service_commissions" ADD CONSTRAINT "professional_service_commissions_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_product_commissions" ADD CONSTRAINT "professional_product_commissions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_product_commissions" ADD CONSTRAINT "professional_product_commissions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
