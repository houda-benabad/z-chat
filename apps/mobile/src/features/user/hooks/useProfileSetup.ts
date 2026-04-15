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
  const { updateProfile } = useUserProfile();
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

    try {
      // Run profile setup and key generation in parallel — they are independent
      const profileTask = async () => {
        let avatarUrl: string | undefined;
        if (avatarUri) {
          avatarUrl = await uploadAvatar(avatarUri);
        }
        // Uses context's updateProfile which calls the API AND sets profile state
        await updateProfile({
          name: displayName.trim(),
          about: about.trim() || undefined,
          avatar: avatarUrl,
        });
      };

      const keyTask = async () => {
        const publicKey = await getOrCreateKeyPair();
        await userApi.uploadPublicKey(publicKey);
      };

      await Promise.all([profileTask(), keyTask()]);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : (err instanceof Error ? err.message : 'Failed to set up profile. Please try again.');
      setError(message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.replace('/chat-list');
  }, [isValid, displayName, about, avatarUri, router, updateProfile]);

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
