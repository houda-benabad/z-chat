import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors, typography } from '../src/theme';

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
  }, [onLayoutReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
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
      </Stack>
    </>
  );
}
