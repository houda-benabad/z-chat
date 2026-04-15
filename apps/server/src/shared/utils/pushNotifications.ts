const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a silent (data-only) push notification.
 * The mobile background task handles all notification display — this payload
 * intentionally has no title/body so the OS doesn't show anything before
 * the app has a chance to decrypt and render the real content.
 *
 * Required data fields (handled by mobile background task):
 *   senderName   — display name to use as notification title
 *   fallbackBody — what to show if decryption is unavailable
 *   messageType  — "text" | "image" | "video" | ...
 *   chatId       — for navigation on tap
 *
 * Optional preview fields (only included when recipient has preview enabled):
 *   encryptedContent  — encrypted message text
 *   senderPublicKey   — sender public key (direct chats)
 *   encryptedGroupKey — recipient's encrypted group key (group chats)
 *   chatType          — "direct" | "group"
 */
export async function sendPushNotification(
  token: string,
  data: Record<string, string>,
): Promise<void> {
  if (!token.startsWith("ExponentPushToken[")) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, data, _contentAvailable: true }),
    });
  } catch {
    // Push delivery is best-effort — don't crash the message flow
  }
}

export function messagePreviewText(type: string): string {
  switch (type) {
    case "image":    return "📷 Photo";
    case "video":    return "🎥 Video";
    case "audio":    return "🎵 Audio";
    case "voice_note": return "🎤 Voice note";
    case "document": return "📄 Document";
    default:         return "New message";
  }
}
