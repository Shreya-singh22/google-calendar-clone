-- AlterTable
ALTER TABLE "Event" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Event_userId_deletedAt_idx" ON "Event"("userId", "deletedAt");
