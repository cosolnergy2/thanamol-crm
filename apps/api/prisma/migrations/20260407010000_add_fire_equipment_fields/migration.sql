-- AlterTable
ALTER TABLE "FireEquipment" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "FireEquipment" ADD COLUMN "model" TEXT;
ALTER TABLE "FireEquipment" ADD COLUMN "serial_number" TEXT;
ALTER TABLE "FireEquipment" ADD COLUMN "capacity_size" TEXT;
ALTER TABLE "FireEquipment" ADD COLUMN "installation_date" TIMESTAMP(3);
ALTER TABLE "FireEquipment" ADD COLUMN "condition" TEXT;
ALTER TABLE "FireEquipment" ADD COLUMN "certification_number" TEXT;
