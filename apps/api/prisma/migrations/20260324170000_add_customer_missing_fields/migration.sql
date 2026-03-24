-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "line_id" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "lead_source" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "budget_range" TEXT,
ADD COLUMN     "deposit_conditions" TEXT,
ADD COLUMN     "profile_url" TEXT,
ADD COLUMN     "pdpa_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interested_project_id" TEXT;

-- CreateIndex
CREATE INDEX "Customer_interested_project_id_idx" ON "Customer"("interested_project_id");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_interested_project_id_fkey" FOREIGN KEY ("interested_project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
