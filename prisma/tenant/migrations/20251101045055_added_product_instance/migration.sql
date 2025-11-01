-- CreateEnum
CREATE TYPE "ProductAction" AS ENUM ('PURCHASED', 'SOLD', 'RETURNED', 'RESOLD', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'LOST');

-- CreateTable
CREATE TABLE "product_instances" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "current_owner_id" TEXT,
    "currentStatus" "ProductStatus" NOT NULL DEFAULT 'IN_STOCK',
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_transactions" (
    "id" TEXT NOT NULL,
    "product_instance_id" TEXT NOT NULL,
    "from_customer_id" TEXT,
    "to_customer_id" TEXT,
    "sale_id" TEXT,
    "action" "ProductAction" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "product_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_instances_serial_number_key" ON "product_instances"("serial_number");

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "organization_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transactions" ADD CONSTRAINT "product_transactions_product_instance_id_fkey" FOREIGN KEY ("product_instance_id") REFERENCES "product_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
