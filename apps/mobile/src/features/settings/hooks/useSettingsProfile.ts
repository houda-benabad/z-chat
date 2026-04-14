import { useState, useEffect, useCallback } from 'react';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
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
  const [avatarRemoved, setAvatarRemoved] = useState(false);
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
      setAvatarRemoved(false);
    }, []),
  );

  const handleAvatarEdit = useCallback(() => {
    const options = ['Take Photo', 'Choose Photo', 'Delete Photo', 'Cancel'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    const onSelect = (index: number) => {
      if (index === 0) cropper.takeAndCrop();
      else if (index === 1) cropper.pickAndCrop();
      else if (index === 2) {
        setAvatarUri(null);
        setAvatarRemoved(true);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        onSelect,
      );
    } else {
      Alert.alert('Profile Photo', undefined, [
        { text: 'Take Photo', onPress: () => onSelect(0) },
        { text: 'Choose Photo', onPress: () => onSelect(1) },
        { text: 'Delete Photo', style: 'destructive', onPress: () => onSelect(2) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [cropper]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a display name');
      return;
    }
    setSaving(true);
    try {
      let avatarValue: string | null | undefined;
      if (avatarRemoved) {
        avatarValue = null;
      } else if (avatarUri) {
        setUploadingAvatar(true);
        avatarValue = await uploadAvatar(avatarUri);
        setUploadingAvatar(false);
        setAvatarUri(null);
      }
      await updateProfile({
        name: trimmedName,
        about: about.trim() || undefined,
        ...(avatarValue !== undefined ? { avatar: avatarValue } : {}),
      });
      setAvatarRemoved(false);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      setUploadingAvatar(false);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [name, about, avatarUri, avatarRemoved, updateProfile]);

  const hasChanges =
    !!avatarUri ||
    avatarRemoved ||
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
    avatarRemoved,
    hasChanges,
    setName,
    setAbout,
    handleAvatarEdit,
    handleSave,
    cropper,
  };
}
