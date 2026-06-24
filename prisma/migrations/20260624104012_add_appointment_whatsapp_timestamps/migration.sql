-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "noShowReportedAt" TIMESTAMP(3),
ADD COLUMN     "notificationSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
