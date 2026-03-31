-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "about" TEXT,
    "avatar" TEXT,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'direct',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_message_id" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT,
    "media_url" TEXT,
    "reply_to_id" TEXT,
    "is_forwarded" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "disappears_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_user_id" TEXT NOT NULL,
    "nickname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "chat_participants_user_id_idx" ON "chat_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_chat_id_user_id_key" ON "chat_participants"("chat_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_user_id_contact_user_id_key" ON "contacts"("user_id", "contact_user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contact_user_id_fkey" FOREIGN KEY ("contact_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
