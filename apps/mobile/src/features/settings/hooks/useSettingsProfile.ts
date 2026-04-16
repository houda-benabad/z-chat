import { useState, useEffect, useCallback } from 'react';
import { alert } from '@/shared/utils/alert';
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

  const handleTakePhoto = useCallback(() => {
    cropper.takeAndCrop();
  }, [cropper]);

  const handleChoosePhoto = useCallback(() => {
    cropper.pickAndCrop();
  }, [cropper]);

  const handleDeletePhoto = useCallback(() => {
    setAvatarUri(null);
    setAvatarRemoved(true);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Name Required', 'Please enter a display name');
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
      alert('Saved', 'Profile updated successfully');
    } catch {
      setUploadingAvatar(false);
      alert('Error', 'Failed to update profile');
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
    handleTakePhoto,
    handleChoosePhoto,
    handleDeletePhoto,
    handleSave,
    cropper,
  };
}
