import 'react-native-get-random-values'; // Must be first — polyfills crypto.getRandomValues for tweetnacl on native
import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { requestNotificationPermissions, registerBackgroundNotificationTask } from '../src/shared/services/notifications';
import { AppSettingsProvider, useAppSettings } from '../src/shared/context/AppSettingsContext';
import { UserProfileProvider } from '../src/shared/context/UserProfileContext';
import { ErrorBoundary, CustomDialog } from '../src/shared/components';
import { setSessionExpiredHandler } from '../src/shared/services/api/client';
import { CallProvider } from '../src/features/calls/components/CallProvider';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
}

function ThemedStatusBar() {
  const { theme } = useAppSettings();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

function ThemedStack() {
  const { appColors } = useAppSettings();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: appColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="phone-auth" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="profile-setup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="contact-sync" options={{ gestureEnabled: false }} />
      <Stack.Screen name="chat-list" options={{ gestureEnabled: false }} />
      <Stack.Screen name="chat" />
      <Stack.Screen name="new-chat" />
      <Stack.Screen name="add-contact" />
      <Stack.Screen name="create-group" />
      <Stack.Screen name="group-info" />
      <Stack.Screen name="add-group-members" />
      <Stack.Screen name="settings-profile" />
      <Stack.Screen name="settings-account" />
      <Stack.Screen name="settings-privacy" />
      <Stack.Screen name="settings-notifications" />
      <Stack.Screen name="settings-storage" />
      <Stack.Screen name="settings-appearance" />
      <Stack.Screen name="settings-blocked" />
      <Stack.Screen name="settings-help" />
      <Stack.Screen name="starred-messages" />
      <Stack.Screen name="user-profile" />
      <Stack.Screen name="call" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/Inter.ttf'),
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    setSessionExpiredHandler(() => router.replace('/'));
  }, [router]);

  useEffect(() => {
    onLayoutReady();
    requestNotificationPermissions();
    registerBackgroundNotificationTask();
  }, [onLayoutReady]);

  useEffect(() => {
    const navigateToChat = (data: Record<string, unknown>) => {
      const chatId = data?.chatId;
      if (typeof chatId !== 'string') return;
      const params: Record<string, string> = { chatId };
      if (typeof data.recipientId === 'string') params.recipientId = data.recipientId;
      if (typeof data.chatType === 'string') params.chatType = data.chatType;
      if (typeof data.name === 'string') params.name = data.name;
      if (typeof data.recipientAvatar === 'string') params.recipientAvatar = data.recipientAvatar;
      setTimeout(() => router.push({ pathname: '/chat', params }), 100);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data;
      if (data) navigateToChat(data);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateToChat(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
    <AppSettingsProvider>
    <UserProfileProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <CallProvider>
          <ThemedStatusBar />
          <ThemedStack />
          <CustomDialog />
        </CallProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
    </UserProfileProvider>
    </AppSettingsProvider>
    </ErrorBoundary>
  );
});
