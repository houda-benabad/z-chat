import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { uploadAvatar } from '@/shared/services/api';
import { useUserProfile } from '@/shared/context/UserProfileContext';
import { useImageCropper } from '@/shared/hooks';
import type { UseImageCropperReturn } from '@/shared/hooks/useImageCropper';

export function useSettingsProfile() {
  const { profile, loading, updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setAbout(profile.about ?? '');
    }
  }, [profile]);

  const cropper = useImageCropper(
    useCallback((croppedUri: string) => {
      setAvatarUri(croppedUri);
    }, []),
  );

  const handlePickAvatar = cropper.pickAndCrop;

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a display name');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        setUploadingAvatar(true);
        avatarUrl = await uploadAvatar(avatarUri);
        setUploadingAvatar(false);
        setAvatarUri(null);
      }
      await updateProfile({
        name: trimmedName,
        about: about.trim() || undefined,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      });
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      setUploadingAvatar(false);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [name, about, avatarUri, updateProfile]);

  const hasChanges =
    !!avatarUri ||
    name.trim() !== (profile?.name ?? '') ||
    about.trim() !== (profile?.about ?? '');

  return {
    profile,
    loading,
    saving,
    uploadingAvatar,
    name,
    about,
    avatarUri,
    hasChanges,
    setName,
    setAbout,
    handlePickAvatar,
    handleSave,
    cropper,
  };
}
