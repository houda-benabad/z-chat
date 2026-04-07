const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!token.startsWith("ExponentPushToken[")) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, sound: "default", data }),
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
