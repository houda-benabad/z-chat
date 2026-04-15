-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ONGOING', 'ENDED', 'MISSED', 'REJECTED', 'NO_ANSWER', 'BUSY');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('CALLER_HANGUP', 'CALLEE_HANGUP', 'NETWORK_ERROR', 'TIMEOUT');

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "callee_id" TEXT,
    "chat_id" TEXT,
    "channel_name" TEXT NOT NULL,
    "type" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "end_reason" "EndReason",

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calls_caller_id_started_at_idx" ON "calls"("caller_id", "started_at");

-- CreateIndex
CREATE INDEX "calls_callee_id_started_at_idx" ON "calls"("callee_id", "started_at");

-- CreateIndex
CREATE INDEX "calls_channel_name_idx" ON "calls"("channel_name");

-- CreateIndex
CREATE INDEX "blocked_users_blocked_user_id_idx" ON "blocked_users"("blocked_user_id");

-- CreateIndex
CREATE INDEX "chat_participants_chat_id_idx" ON "chat_participants"("chat_id");

-- CreateIndex
CREATE INDEX "starred_messages_user_id_created_at_idx" ON "starred_messages"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_callee_id_fkey" FOREIGN KEY ("callee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
