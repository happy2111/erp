-- DropForeignKey
ALTER TABLE "public"."audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."documents" DROP CONSTRAINT "documents_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."kassa_transfers" DROP CONSTRAINT "kassa_transfers_from_kassa_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."kassa_transfers" DROP CONSTRAINT "kassa_transfers_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."kassa_transfers" DROP CONSTRAINT "kassa_transfers_to_kassa_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."kassas" DROP CONSTRAINT "kassas_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."organization_customers" DROP CONSTRAINT "organization_customers_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."organization_users" DROP CONSTRAINT "organization_users_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."organization_users" DROP CONSTRAINT "organization_users_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_kassa_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_instances" DROP CONSTRAINT "product_instances_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_instances" DROP CONSTRAINT "product_instances_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_prices" DROP CONSTRAINT "product_prices_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchases" DROP CONSTRAINT "purchases_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchases" DROP CONSTRAINT "purchases_responsible_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sales" DROP CONSTRAINT "sales_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sales" DROP CONSTRAINT "sales_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."settings" DROP CONSTRAINT "settings_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."stocks" DROP CONSTRAINT "stocks_organization_id_fkey";

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "responsible_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "customer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_customers" ADD CONSTRAINT "organization_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kassas" ADD CONSTRAINT "kassas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kassa_transfers" ADD CONSTRAINT "kassa_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kassa_transfers" ADD CONSTRAINT "kassa_transfers_from_kassa_id_fkey" FOREIGN KEY ("from_kassa_id") REFERENCES "kassas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kassa_transfers" ADD CONSTRAINT "kassa_transfers_to_kassa_id_fkey" FOREIGN KEY ("to_kassa_id") REFERENCES "kassas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_kassa_id_fkey" FOREIGN KEY ("kassa_id") REFERENCES "kassas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "organization_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
