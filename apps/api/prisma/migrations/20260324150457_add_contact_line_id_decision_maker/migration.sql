-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "is_decision_maker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "line_id" TEXT;
