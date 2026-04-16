import { useState, useCallback } from 'react';
import { alert } from '@/shared/utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { PendingMedia } from '../components/MediaPreviewModal';

type MediaSelectedCallback = (
  uri: string,
  mimeType: string,
  mediaType: 'image' | 'video' | 'document',
  caption: string,
) => Promise<void>;

interface UseAttachmentPickerParams {
  onMediaSelected: MediaSelectedCallback;
  disabled?: boolean;
}

export function useAttachmentPicker({ onMediaSelected, disabled }: UseAttachmentPickerParams) {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);

  const openCamera = useCallback(async () => {
    if (disabled) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera Access Required', 'Please enable camera access in Settings.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0]!;
      const mediaType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
      setPendingMedia({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        mediaType,
      });
    }
  }, [disabled]);

  const openGallery = useCallback(async () => {
    if (disabled) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Media Access Required', 'Please enable media library access in Settings.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0]!;
      const mediaType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
      setPendingMedia({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        mediaType,
      });
    }
  }, [disabled]);

  const openDocument = useCallback(async () => {
    if (disabled) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0]!;
      setPendingMedia({
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
        mediaType: 'document',
        filename: asset.name,
      });
    }
  }, [disabled]);

  const confirmSend = useCallback(async (caption: string) => {
    if (!pendingMedia) return;
    const { uri, mimeType, mediaType } = pendingMedia;
    setPendingMedia(null);
    await onMediaSelected(uri, mimeType, mediaType, caption);
  }, [pendingMedia, onMediaSelected]);

  const cancelPending = useCallback(() => {
    setPendingMedia(null);
  }, []);

  return { openCamera, openGallery, openDocument, pendingMedia, confirmSend, cancelPending };
}
