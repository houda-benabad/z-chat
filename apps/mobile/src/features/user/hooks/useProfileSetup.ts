import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MAX_DISPLAY_NAME_LENGTH, MAX_ABOUT_LENGTH } from '@z-chat/shared';
import { userApi, uploadAvatar, ApiError } from '@/shared/services/api';
import { getOrCreateKeyPair } from '@/shared/services/crypto';
import { useUserProfile } from '@/shared/context/UserProfileContext';

export interface UseProfileSetupReturn {
  displayName: string;
  setDisplayName: (n: string) => void;
  about: string;
  setAbout: (a: string) => void;
  avatarUri: string | null;
  isLoading: boolean;
  error: string | null;
  isValid: boolean;
  handlePickAvatar: () => Promise<void>;
  handleContinue: () => Promise<void>;
}

export function useProfileSetup(): UseProfileSetupReturn {
  const router = useRouter();
  const { refreshProfile } = useUserProfile();
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = displayName.trim().length > 0;

  const handlePickAvatar = useCallback(async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to set a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    // Step 1: avatar upload + profile update
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }
      await userApi.updateProfile({
        name: displayName.trim(),
        about: about.trim() || undefined,
        avatar: avatarUrl,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to update profile. Please try again.',
      );
      setIsLoading(false);
      return;
    }

    // Step 2: E2E key generation + publishing
    try {
      const publicKey = await getOrCreateKeyPair();
      await userApi.uploadPublicKey(publicKey);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to initialize encryption. Please try again.',
      );
      setIsLoading(false);
      return;
    }

    await refreshProfile();
    setIsLoading(false);
    router.replace('/chat-list');
  }, [isValid, displayName, about, avatarUri, router, refreshProfile]);

  return {
    displayName,
    setDisplayName,
    about,
    setAbout,
    avatarUri,
    isLoading,
    error,
    isValid,
    handlePickAvatar,
    handleContinue,
  };
}
