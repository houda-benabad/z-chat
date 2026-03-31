import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show notifications even when app is in foreground (useful for dev testing)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
