-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "avgRating" DECIMAL(2,1),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "yearStarted" INTEGER;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "clientName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointmentId_key" ON "reviews"("appointmentId");

-- CreateIndex
CREATE INDEX "reviews_barbershopId_idx" ON "reviews"("barbershopId");

-- CreateIndex
CREATE INDEX "reviews_professionalId_idx" ON "reviews"("professionalId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
