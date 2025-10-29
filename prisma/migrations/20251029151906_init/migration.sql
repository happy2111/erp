/*
  Warnings:

  - You are about to drop the `AuditTenantCreations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tenant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AuditTenantCreations" DROP CONSTRAINT "AuditTenantCreations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Tenant" DROP CONSTRAINT "Tenant_owner_id_fkey";

-- DropTable
DROP TABLE "public"."AuditTenantCreations";

-- DropTable
DROP TABLE "public"."Tenant";

-- DropTable
DROP TABLE "public"."User";

-- DropEnum
DROP TYPE "public"."TenantStatus";

-- DropEnum
DROP TYPE "public"."UserRole";
