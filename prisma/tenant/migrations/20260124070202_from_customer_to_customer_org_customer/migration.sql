-- AddForeignKey
ALTER TABLE "product_transactions" ADD CONSTRAINT "product_transactions_from_customer_id_fkey" FOREIGN KEY ("from_customer_id") REFERENCES "organization_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transactions" ADD CONSTRAINT "product_transactions_to_customer_id_fkey" FOREIGN KEY ("to_customer_id") REFERENCES "organization_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
