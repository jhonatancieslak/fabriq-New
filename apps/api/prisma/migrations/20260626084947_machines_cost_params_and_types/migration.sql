-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MachineType" ADD VALUE 'cnc_router';
ALTER TYPE "MachineType" ADD VALUE 'plasma';
ALTER TYPE "MachineType" ADD VALUE 'waterjet';
ALTER TYPE "MachineType" ADD VALUE 'welding';
ALTER TYPE "MachineType" ADD VALUE 'turning';
ALTER TYPE "MachineType" ADD VALUE 'milling';
ALTER TYPE "MachineType" ADD VALUE 'other';

-- AlterTable
ALTER TABLE "machines" ADD COLUMN     "cost_per_hour" DECIMAL(65,30),
ADD COLUMN     "cost_per_min_after_min" DECIMAL(65,30),
ADD COLUMN     "margin_percent" DECIMAL(65,30),
ADD COLUMN     "material_cost_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "min_billed_minutes" INTEGER;
