-- AlterTable
ALTER TABLE "chat_participants" ADD COLUMN     "encrypted_group_key" TEXT,
ADD COLUMN     "group_key_version" INTEGER NOT NULL DEFAULT 0;
