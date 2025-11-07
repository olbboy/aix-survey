-- CreateEnum: EmailStatus
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED');

-- CreateTable: EmailNotification
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "attachments" JSONB,
    "templateData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_notifications_assessmentId_idx" ON "email_notifications"("assessmentId");
CREATE INDEX "email_notifications_recipientEmail_idx" ON "email_notifications"("recipientEmail");
CREATE INDEX "email_notifications_status_idx" ON "email_notifications"("status");
CREATE INDEX "email_notifications_sentAt_idx" ON "email_notifications"("sentAt");

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
