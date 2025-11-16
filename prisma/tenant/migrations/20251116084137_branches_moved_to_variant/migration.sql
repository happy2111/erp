/*
  Warnings:

  - You are about to drop the column `product_id` on the `product_batches` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `purchase_items` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `stocks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organization_id,product_variant_id]` on the table `stocks` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `product_variant_id` to the `product_batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_variant_id` to the `purchase_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_variant_id` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_variant_id` to the `stocks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "product_batches" DROP CONSTRAINT "product_batches_product_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "stocks" DROP CONSTRAINT "stocks_product_id_fkey";

-- DropIndex
DROP INDEX "stocks_organization_id_product_id_key";

-- AlterTable
ALTER TABLE "product_batches" DROP COLUMN "product_id",
ADD COLUMN     "product_variant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "purchase_items" DROP COLUMN "product_id",
ADD COLUMN     "product_variant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sale_items" DROP COLUMN "product_id",
ADD COLUMN     "product_variant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "stocks" DROP COLUMN "product_id",
ADD COLUMN     "product_variant_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "stocks_organization_id_product_variant_id_key" ON "stocks"("organization_id", "product_variant_id");

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
