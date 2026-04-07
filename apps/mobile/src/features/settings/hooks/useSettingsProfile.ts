import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@/shared/services/api';
import { useUserProfile } from '@/shared/context/UserProfileContext';

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

  const handlePickAvatar = useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
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
  };
}
