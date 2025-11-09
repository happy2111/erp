/*
  Warnings:

  - A unique constraint covering the columns `[hostname]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."audit_tenant_creations" DROP CONSTRAINT "audit_tenant_creations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tenants" DROP CONSTRAINT "tenants_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_refresh_tokens" DROP CONSTRAINT "user_refresh_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_tenant_creations" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "owner_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_hostname_key" ON "tenants"("hostname");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_tenant_creations" ADD CONSTRAINT "audit_tenant_creations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
