-- CreateIndex
CREATE INDEX "appointments_barbershopId_professionalId_date_idx" ON "appointments"("barbershopId", "professionalId", "date");

-- CreateIndex
CREATE INDEX "comanda_items_comandaId_idx" ON "comanda_items"("comandaId");

-- CreateIndex
CREATE INDEX "comanda_items_comandaId_commissionValue_idx" ON "comanda_items"("comandaId", "commissionValue");
