const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification with visible title/body for Android FCM delivery
 * plus encrypted data payload for the mobile background task to decrypt.
 *
 * When the app is alive in background, the background task dismisses the
 * OS-displayed fallback and replaces it with the decrypted content.
 * When the app is killed, the OS shows the fallback title/body directly.
 */
export async function sendPushNotification(
  token: string,
  data: Record<string, string>,
  display: { title: string; body: string; sound: boolean },
): Promise<void> {
  if (!token.startsWith("ExponentPushToken[")) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title: display.title,
        body: display.body,
        sound: display.sound ? "default" : undefined,
        data,
        priority: "high",
        channelId: "messages",
        _contentAvailable: true,
      }),
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
