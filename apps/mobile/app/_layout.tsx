import 'react-native-get-random-values'; // Must be first — polyfills crypto.getRandomValues for tweetnacl on native
import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { requestNotificationPermissions } from '../src/shared/services/notifications';
import { AppSettingsProvider, useAppSettings } from '../src/shared/context/AppSettingsContext';
import { UserProfileProvider } from '../src/shared/context/UserProfileContext';
import { setSessionExpiredHandler } from '../src/shared/services/api/client';

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
  }, [onLayoutReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppSettingsProvider>
    <UserProfileProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedStatusBar />
      <ThemedStack />
    </GestureHandlerRootView>
    </UserProfileProvider>
    </AppSettingsProvider>
  );
});
