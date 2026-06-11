-- CreateTable
CREATE TABLE "insight_dismissals" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "recId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insight_dismissals_barbershopId_idx" ON "insight_dismissals"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "insight_dismissals_barbershopId_recId_key" ON "insight_dismissals"("barbershopId", "recId");
