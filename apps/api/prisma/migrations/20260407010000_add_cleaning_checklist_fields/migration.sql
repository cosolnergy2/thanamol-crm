-- AlterTable
ALTER TABLE "CleaningChecklist" ADD COLUMN "checklist_number" TEXT;
ALTER TABLE "CleaningChecklist" ADD COLUMN "site_id" TEXT;
ALTER TABLE "CleaningChecklist" ADD COLUMN "shift" TEXT;
ALTER TABLE "CleaningChecklist" ADD COLUMN "cleaning_areas" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "CleaningChecklist" ADD COLUMN "cleaner_id" TEXT;
ALTER TABLE "CleaningChecklist" ADD COLUMN "supervisor_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CleaningChecklist_checklist_number_key" ON "CleaningChecklist"("checklist_number");
