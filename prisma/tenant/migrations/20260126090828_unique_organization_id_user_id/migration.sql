/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,user_id]` on the table `organization_users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "organization_users_organization_id_user_id_key" ON "organization_users"("organization_id", "user_id");
