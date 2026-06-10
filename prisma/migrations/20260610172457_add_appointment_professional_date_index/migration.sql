-- CreateIndex
CREATE INDEX "appointments_professionalId_date_endTime_idx" ON "appointments"("professionalId", "date", "endTime");
