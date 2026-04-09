-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "theme" SET DEFAULT 'light';

-- CreateTable
CREATE TABLE "starred_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "starred_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "starred_messages_user_id_idx" ON "starred_messages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "starred_messages_user_id_message_id_key" ON "starred_messages"("user_id", "message_id");

-- AddForeignKey
ALTER TABLE "starred_messages" ADD CONSTRAINT "starred_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "starred_messages" ADD CONSTRAINT "starred_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
