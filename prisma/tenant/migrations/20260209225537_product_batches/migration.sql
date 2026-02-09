/*
  Warnings:

  - A unique constraint covering the columns `[product_variant_id,batch_number]` on the table `product_batches` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "product_batches" ADD COLUMN     "purchaseItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_product_variant_id_batch_number_key" ON "product_batches"("product_variant_id", "batch_number");

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
