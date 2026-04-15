import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

type MediaType = 'image' | 'video' | 'document';

interface UseAttachmentPickerParams {
  onMediaSelected: (uri: string, mimeType: string, mediaType: MediaType) => Promise<void>;
  disabled?: boolean;
}

export function useAttachmentPicker({ onMediaSelected, disabled }: UseAttachmentPickerParams) {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setMenuVisible(true);
  }, [disabled]);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMenuVisible(false);
      Alert.alert('Photo Access Required', 'Please enable photo library access in Settings to send images.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    setMenuVisible(false);
    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        await onMediaSelected(asset.uri, asset.mimeType ?? 'image/jpeg', 'image');
      }
    }
  }, [onMediaSelected]);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMenuVisible(false);
      Alert.alert('Media Access Required', 'Please enable media library access in Settings to send videos.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: true,
    });
    setMenuVisible(false);
    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        await onMediaSelected(asset.uri, asset.mimeType ?? 'video/mp4', 'video');
      }
    }
  }, [onMediaSelected]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      multiple: true,
    });
    setMenuVisible(false);
    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        await onMediaSelected(asset.uri, asset.mimeType ?? 'application/pdf', 'document');
      }
    }
  }, [onMediaSelected]);

  return { menuVisible, openMenu, closeMenu, pickPhoto, pickVideo, pickDocument };
}
