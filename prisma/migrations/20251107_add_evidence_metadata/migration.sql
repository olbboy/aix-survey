-- AlterTable: Add metadata fields to Evidence model
ALTER TABLE "evidences" ADD COLUMN "description" TEXT;
ALTER TABLE "evidences" ADD COLUMN "uploadedBy" TEXT;
ALTER TABLE "evidences" ADD COLUMN "itemCode" TEXT;
ALTER TABLE "evidences" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: Add index on uploadedBy for performance
CREATE INDEX "evidences_uploadedBy_idx" ON "evidences"("uploadedBy");
