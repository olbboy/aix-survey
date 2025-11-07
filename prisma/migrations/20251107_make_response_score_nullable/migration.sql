-- AlterTable: Make Response.score nullable
-- This allows responses to be saved without a score (unanswered questions)

ALTER TABLE "responses" ALTER COLUMN "score" DROP NOT NULL;

-- Update any existing responses with score=0 to NULL
-- (score should be 1-5 or NULL, never 0)
UPDATE "responses" SET "score" = NULL WHERE "score" = 0;
