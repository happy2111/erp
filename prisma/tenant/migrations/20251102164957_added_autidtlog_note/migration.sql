/*
  Warnings:

  - You are about to drop the `CurrencyRate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductBatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductPrice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ProductBatch" DROP CONSTRAINT "ProductBatch_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductPrice" DROP CONSTRAINT "ProductPrice_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductPrice" DROP CONSTRAINT "ProductPrice_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductPrice" DROP CONSTRAINT "ProductPrice_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PurchaseItem" DROP CONSTRAINT "PurchaseItem_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PurchaseItem" DROP CONSTRAINT "PurchaseItem_purchase_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleItem" DROP CONSTRAINT "SaleItem_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleItem" DROP CONSTRAINT "SaleItem_product_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleItem" DROP CONSTRAINT "SaleItem_sale_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "note" TEXT;

-- DropTable
DROP TABLE "public"."CurrencyRate";

-- DropTable
DROP TABLE "public"."ProductBatch";

-- DropTable
DROP TABLE "public"."ProductPrice";

-- DropTable
DROP TABLE "public"."PurchaseItem";

-- DropTable
DROP TABLE "public"."SaleItem";

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "price_type" "PriceType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency_id" TEXT NOT NULL,
    "customer_type" "CustomerType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "currency_id" TEXT NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
