import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { MAX_DISPLAY_NAME_LENGTH, MAX_ABOUT_LENGTH } from '@z-chat/shared';
import { userApi, uploadAvatar, ApiError } from '@/shared/services/api';
import { getOrCreateKeyPair } from '@/shared/services/crypto';
import { useUserProfile } from '@/shared/context/UserProfileContext';
import { useImageCropper } from '@/shared/hooks';
import type { UseImageCropperReturn } from '@/shared/hooks/useImageCropper';

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
  cropper: UseImageCropperReturn;
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

  const cropper = useImageCropper(
    useCallback((croppedUri: string) => {
      setAvatarUri(croppedUri);
    }, []),
  );

  const handlePickAvatar = cropper.pickAndCrop;

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
      console.error('[Encryption init error]', err);
      const message = err instanceof ApiError
        ? err.message
        : (err instanceof Error ? err.message : 'Failed to initialize encryption. Please try again.');
      setError(message);
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
    cropper,
  };
}
