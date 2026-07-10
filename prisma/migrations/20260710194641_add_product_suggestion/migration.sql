-- CreateTable
CREATE TABLE "product_suggestions" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "membershipId" TEXT,
    "role" "MemberRole" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_suggestions_barbershopId_createdAt_idx" ON "product_suggestions"("barbershopId", "createdAt");

-- AddForeignKey
ALTER TABLE "product_suggestions" ADD CONSTRAINT "product_suggestions_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suggestions" ADD CONSTRAINT "product_suggestions_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
