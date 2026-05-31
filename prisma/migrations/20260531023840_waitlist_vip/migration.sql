-- CreateTable
CREATE TABLE "waitlist_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "barbershopName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'workshop-tx',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_leads_source_idx" ON "waitlist_leads"("source");
