-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "deposit_months" INTEGER,
ADD COLUMN     "advance_rent_months" INTEGER,
ADD COLUMN     "electricity_rate_type" TEXT,
ADD COLUMN     "electricity_rate" DOUBLE PRECISION,
ADD COLUMN     "water_rate" DOUBLE PRECISION,
ADD COLUMN     "deposit_decoration" TEXT,
ADD COLUMN     "registration_fee" TEXT,
ADD COLUMN     "property_tax" TEXT,
ADD COLUMN     "building_insurance" TEXT,
ADD COLUMN     "goods_insurance" TEXT,
ADD COLUMN     "special_conditions" TEXT,
ADD COLUMN     "remarks" TEXT;
