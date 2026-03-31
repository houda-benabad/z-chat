-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_seen_visibility" TEXT NOT NULL DEFAULT 'everyone',
    "profile_photo_visibility" TEXT NOT NULL DEFAULT 'everyone',
    "about_visibility" TEXT NOT NULL DEFAULT 'everyone',
    "read_receipts" BOOLEAN NOT NULL DEFAULT true,
    "default_disappear_timer" INTEGER NOT NULL DEFAULT 0,
    "message_notifications" BOOLEAN NOT NULL DEFAULT true,
    "group_notifications" BOOLEAN NOT NULL DEFAULT true,
    "call_notifications" BOOLEAN NOT NULL DEFAULT true,
    "notification_sound" BOOLEAN NOT NULL DEFAULT true,
    "notification_vibrate" BOOLEAN NOT NULL DEFAULT true,
    "notification_preview" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "accent_color" TEXT NOT NULL DEFAULT '#E46C53',
    "font_size" TEXT NOT NULL DEFAULT 'medium',
    "auto_download_photos" BOOLEAN NOT NULL DEFAULT true,
    "auto_download_videos" BOOLEAN NOT NULL DEFAULT false,
    "auto_download_documents" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "blocked_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "blocked_users_user_id_idx" ON "blocked_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_user_id_blocked_user_id_key" ON "blocked_users"("user_id", "blocked_user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
