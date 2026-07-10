-- CreateTable
CREATE TABLE "hint_dismissals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hintKey" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hint_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hint_dismissals_userId_idx" ON "hint_dismissals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hint_dismissals_userId_hintKey_key" ON "hint_dismissals"("userId", "hintKey");

-- AddForeignKey
ALTER TABLE "hint_dismissals" ADD CONSTRAINT "hint_dismissals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
