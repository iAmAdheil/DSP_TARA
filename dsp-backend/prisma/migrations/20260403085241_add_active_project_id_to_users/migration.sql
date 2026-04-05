-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_project_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_project_id_fkey" FOREIGN KEY ("active_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
