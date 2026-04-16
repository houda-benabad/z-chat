import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { alert } from '@/shared/utils/alert';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { CropRegion } from '../components/ImageCropper/cropUtils';

interface UseImageCropperOptions {
  outputSize?: number;
  quality?: number;
}

export interface UseImageCropperReturn {
  visible: boolean;
  sourceUri: string | null;
  sourceWidth: number;
  sourceHeight: number;
  processing: boolean;
  pickAndCrop: () => Promise<void>;
  takeAndCrop: () => Promise<void>;
  confirmCrop: (cropRegion: CropRegion) => Promise<void>;
  cancelCrop: () => void;
}

export function useImageCropper(
  onResult: (uri: string) => void,
  options?: UseImageCropperOptions,
): UseImageCropperReturn {
  const outputSize = options?.outputSize ?? 300;
  const quality = options?.quality ?? 0.8;

  const [visible, setVisible] = useState(false);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [processing, setProcessing] = useState(false);

  const pickAndCrop = useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      alert(
        'Permission Required',
        'Please allow access to your photo library.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setSourceUri(asset.uri);
    setSourceWidth(asset.width);
    setSourceHeight(asset.height);
    setVisible(true);
  }, []);

  const takeAndCrop = useCallback(async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      alert(
        'Permission Required',
        'Please allow access to your camera.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setSourceUri(asset.uri);
    setSourceWidth(asset.width);
    setSourceHeight(asset.height);
    setVisible(true);
  }, []);

  const confirmCrop = useCallback(
    async (cropRegion: CropRegion) => {
      if (!sourceUri) return;
      setProcessing(true);
      try {
        const actions: ImageManipulator.Action[] = [{ crop: cropRegion }];
        if (Platform.OS !== 'web') {
          actions.push({ resize: { width: outputSize, height: outputSize } });
        }
        const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        setVisible(false);
        setSourceUri(null);
        onResult(result.uri);
      } catch {
        alert('Error', 'Failed to crop image. Please try again.');
      } finally {
        setProcessing(false);
      }
    },
    [sourceUri, outputSize, quality, onResult],
  );

  const cancelCrop = useCallback(() => {
    setVisible(false);
    setSourceUri(null);
  }, []);

  return {
    visible,
    sourceUri,
    sourceWidth,
    sourceHeight,
    processing,
    pickAndCrop,
    takeAndCrop,
    confirmCrop,
    cancelCrop,
  };
}
