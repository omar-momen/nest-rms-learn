-- Add a stable identifier shared by every refresh-token rotation chain.
ALTER TABLE "Session" ADD COLUMN "familyId" TEXT;

-- Existing sessions each start as their own family.
UPDATE "Session" SET "familyId" = "id";

ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");
