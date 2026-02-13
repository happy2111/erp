-- DropForeignKey
ALTER TABLE "public"."settings" DROP CONSTRAINT "settings_base_currency_id_fkey";

-- AlterTable
ALTER TABLE "settings" ALTER COLUMN "base_currency_id" DROP NOT NULL,
ALTER COLUMN "enableInstallment" SET DEFAULT false,
ALTER COLUMN "enableNotifications" SET DEFAULT false;

-- CreateTable
CREATE TABLE "InstallmentSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minInitialPayment" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "penaltyPercent" DOUBLE PRECISION,
    "penaltyFixed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL,
    "installmentSettingId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentSetting_organizationId_key" ON "InstallmentSetting"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_installmentSettingId_months_key" ON "InstallmentPlan"("installmentSettingId", "months");

-- AddForeignKey
ALTER TABLE "InstallmentSetting" ADD CONSTRAINT "InstallmentSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_installmentSettingId_fkey" FOREIGN KEY ("installmentSettingId") REFERENCES "InstallmentSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
