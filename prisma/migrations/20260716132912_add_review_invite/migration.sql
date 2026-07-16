-- CreateTable
CREATE TABLE "review_invites" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_invites_appointmentId_key" ON "review_invites"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "review_invites_tokenHash_key" ON "review_invites"("tokenHash");

-- AddForeignKey
ALTER TABLE "review_invites" ADD CONSTRAINT "review_invites_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
