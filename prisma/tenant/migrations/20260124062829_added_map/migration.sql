/*
  Warnings:

  - You are about to drop the column `createdById` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "createdById",
ADD COLUMN     "created_by_id" TEXT;
