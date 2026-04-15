import { forwardRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/AttachmentSheet.styles';

interface AttachmentSheetProps {
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
}

const ITEMS = [
  { key: 'camera',   label: 'Camera',   icon: 'camera-outline',   bg: '#E46C53' },
  { key: 'gallery',  label: 'Gallery',  icon: 'images-outline',   bg: '#4D7E82' },
  { key: 'document', label: 'Document', icon: 'document-outline', bg: '#F1A167' },
] as const;

export const AttachmentSheet = forwardRef<BottomSheetModal, AttachmentSheetProps>(
  function AttachmentSheet({ onCamera, onGallery, onDocument }, ref) {
    const styles = useThemedStyles(createStyles);

    const handlers: Record<string, () => void> = {
      camera: onCamera,
      gallery: onGallery,
      document: onDocument,
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#ccc', width: 36 }}
        backgroundStyle={{ backgroundColor: styles.container.backgroundColor }}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.grid}>
            {ITEMS.map(({ key, label, icon, bg }) => (
              <Pressable
                key={key}
                style={styles.item}
                onPress={handlers[key]}
                hitSlop={8}
              >
                <View style={[styles.circle, { backgroundColor: bg }]}>
                  <Ionicons name={icon as any} size={26} color="#fff" />
                </View>
                <Text style={styles.label}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
