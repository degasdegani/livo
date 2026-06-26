-- AlterTable
ALTER TABLE "comanda_items" ADD COLUMN     "clientSubscriptionId" TEXT;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_clientSubscriptionId_fkey" FOREIGN KEY ("clientSubscriptionId") REFERENCES "client_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
