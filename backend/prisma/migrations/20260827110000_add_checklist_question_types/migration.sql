ALTER TABLE "checklist_items" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'FOTO';
ALTER TABLE "checklist_items" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "checklist_items" ADD COLUMN "options" JSONB;

CREATE TABLE "checklist_responses" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checklist_responses_visitId_checklistItemId_key" ON "checklist_responses"("visitId", "checklistItemId");
CREATE INDEX "checklist_responses_checklistItemId_idx" ON "checklist_responses"("checklistItemId");

ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_responses" ADD CONSTRAINT "checklist_responses_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
