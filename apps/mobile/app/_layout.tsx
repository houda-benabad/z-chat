import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, typography } from '../src/theme';
import { requestNotificationPermissions } from '../src/services/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/Inter.ttf'),
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutReady();
    requestNotificationPermissions();
  }, [onLayoutReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="phone-auth" />
        <Stack.Screen name="otp-verification" />
        <Stack.Screen
          name="profile-setup"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="chat-list"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="chat" />
        <Stack.Screen name="new-chat" />
        <Stack.Screen name="add-contact" />
        <Stack.Screen name="create-group" />
        <Stack.Screen name="group-info" />
        <Stack.Screen name="add-group-members" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="settings-profile" />
        <Stack.Screen name="settings-account" />
        <Stack.Screen name="settings-privacy" />
        <Stack.Screen name="settings-notifications" />
        <Stack.Screen name="settings-storage" />
        <Stack.Screen name="settings-appearance" />
        <Stack.Screen name="settings-blocked" />
        <Stack.Screen name="settings-help" />
        <Stack.Screen name="user-profile" />
      </Stack>
    </GestureHandlerRootView>
  );
}
