-- AlterTable
ALTER TABLE "chat_participants" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT;
