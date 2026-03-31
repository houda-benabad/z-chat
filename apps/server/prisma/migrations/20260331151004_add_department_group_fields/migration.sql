-- AlterTable
ALTER TABLE "chat_participants" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "department" TEXT,
ADD COLUMN     "job_title" TEXT;
