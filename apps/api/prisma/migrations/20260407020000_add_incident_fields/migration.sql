-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "incident_type" TEXT,
ADD COLUMN "vendor_involved" TEXT,
ADD COLUMN "site_id" TEXT,
ADD COLUMN "location_detail" TEXT;
