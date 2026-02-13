/*
  Warnings:

  - You are about to alter the column `coefficient` on the `InstallmentPlan` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,3)`.
  - You are about to drop the column `maxAmount` on the `InstallmentSetting` table. All the data in the column will be lost.
  - You are about to drop the column `minInitialPayment` on the `InstallmentSetting` table. All the data in the column will be lost.
  - You are about to alter the column `penaltyPercent` on the `InstallmentSetting` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to alter the column `penaltyFixed` on the `InstallmentSetting` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.

*/
-- DropForeignKey
ALTER TABLE "public"."InstallmentSetting" DROP CONSTRAINT "InstallmentSetting_organizationId_fkey";

-- AlterTable
ALTER TABLE "InstallmentPlan" ALTER COLUMN "coefficient" SET DATA TYPE DECIMAL(5,3);

-- AlterTable
ALTER TABLE "InstallmentSetting" DROP COLUMN "maxAmount",
DROP COLUMN "minInitialPayment",
ALTER COLUMN "penaltyPercent" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "penaltyFixed" SET DATA TYPE DECIMAL(15,2);

-- CreateTable
CREATE TABLE "InstallmentLimit" (
    "id" TEXT NOT NULL,
    "installmentSettingId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "minInitialPayment" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),

    CONSTRAINT "InstallmentLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentLimit_installmentSettingId_currencyId_key" ON "InstallmentLimit"("installmentSettingId", "currencyId");

-- AddForeignKey
ALTER TABLE "InstallmentSetting" ADD CONSTRAINT "InstallmentSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentLimit" ADD CONSTRAINT "InstallmentLimit_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentLimit" ADD CONSTRAINT "InstallmentLimit_installmentSettingId_fkey" FOREIGN KEY ("installmentSettingId") REFERENCES "InstallmentSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
