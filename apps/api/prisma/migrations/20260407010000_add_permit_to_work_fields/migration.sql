-- AlterTable
ALTER TABLE "PermitToWork" ADD COLUMN "company_id" TEXT,
ADD COLUMN "site_id" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "unit" TEXT,
ADD COLUMN "contractor_contact" TEXT,
ADD COLUMN "workers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "ppe_required" JSONB NOT NULL DEFAULT '[]';
