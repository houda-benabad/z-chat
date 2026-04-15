import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  decryptMessage,
  decryptGroupMessage,
  decryptGroupKey,
  isEncrypted,
} from '@/shared/services/crypto';

// Show notifications even when app is in foreground (useful for dev testing)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Background notification task ───────────────────────────────────────────
// Must be defined at module level so it's registered before the app tree renders.
// Receives the silent push from the server, decrypts the content if preview keys
// are present, then schedules a local notification with the real message text.

const BACKGROUND_NOTIFICATION_TASK = 'ZCHAT_BACKGROUND_NOTIFICATION';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
    if (error || !data) return;

    const notification = (data as { notification?: { request?: { content?: { data?: unknown } } } })
      .notification;
    const pushData = (notification?.request?.content?.data ?? {}) as Record<string, string>;

    const { senderName, fallbackBody, messageType, chatId, chatType, encryptedContent, senderPublicKey, encryptedGroupKey } = pushData;

    let body = fallbackBody ?? 'New message';

    if (encryptedContent && isEncrypted(encryptedContent)) {
      try {
        if (chatType === 'group' && encryptedGroupKey) {
          const groupKey = await decryptGroupKey(encryptedGroupKey);
          if (groupKey) {
            const plain = decryptGroupMessage(encryptedContent, groupKey);
            if (plain) body = plain;
          }
        } else if (chatType === 'direct' && senderPublicKey) {
          const plain = await decryptMessage(encryptedContent, senderPublicKey);
          if (plain) body = plain;
        }
      } catch {
        // decryption failed — show fallback
      }
    } else if (messageType && messageType !== 'text') {
      body = fallbackBody ?? 'New message'; // already set, but explicit
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: senderName ?? 'New message',
        body: isEncrypted(body) ? 'New message' : body,
        data: { chatId },
        sound: true,
      },
      trigger: null,
    });
  });
}

export async function registerBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch {
    // Already registered or not supported on this platform
  }
}

// ─── Permissions & token ────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null; // push tokens don't work in simulators

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch {
    return null;
  }
}

// ─── Foreground notification (socket path) ──────────────────────────────────

export async function showMessageNotification(
  senderName: string,
  body: string,
  chatId: string,
  extra?: { recipientId?: string; chatType?: string; name?: string; recipientAvatar?: string },
): Promise<void> {
  if (Platform.OS === 'web') return;
  // Safety net: never show raw encrypted JSON in a notification
  const safeBody = isEncrypted(body) ? 'New message' : body;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: senderName,
      body: safeBody,
      data: { chatId, ...extra },
      sound: true,
    },
    trigger: null, // fire immediately
  });
}
