import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function showMessageNotification(
  senderName: string,
  body: string,
  chatId: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: senderName,
      body,
      data: { chatId },
      sound: true,
    },
    trigger: null, // fire immediately
  });
}
