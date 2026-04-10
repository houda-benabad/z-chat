import React, { useCallback, useRef } from 'react';
import { Modal, View, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CropperView } from './CropperView';
import { CropperControls } from './CropperControls';
import type { CropRegion } from './cropUtils';
import { createStyles } from './styles/ImageCropperModal.styles';

interface ImageCropperModalProps {
  visible: boolean;
  sourceUri: string | null;
  sourceWidth: number;
  sourceHeight: number;
  processing: boolean;
  onConfirm: (cropRegion: CropRegion) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  visible,
  sourceUri,
  sourceWidth,
  sourceHeight,
  processing,
  onConfirm,
  onCancel,
}: ImageCropperModalProps) {
  const styles = createStyles();
  const getCropRegionRef = useRef<(() => CropRegion) | null>(null);

  const handleCropRegionReady = useCallback((fn: () => CropRegion) => {
    getCropRegionRef.current = fn;
  }, []);

  const handleConfirm = useCallback(() => {
    if (getCropRegionRef.current) {
      const region = getCropRegionRef.current();
      onConfirm(region);
    }
  }, [onConfirm]);

  if (!sourceUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.content}>
          <CropperView
            sourceUri={sourceUri}
            imageWidth={sourceWidth}
            imageHeight={sourceHeight}
            onCropRegionReady={handleCropRegionReady}
          />
        </View>
        <CropperControls
          processing={processing}
          onConfirm={handleConfirm}
          onCancel={onCancel}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}
