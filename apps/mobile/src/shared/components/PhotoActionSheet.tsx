import { forwardRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/PhotoActionSheet.styles';

interface PhotoActionSheetProps {
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onDeletePhoto: () => void;
}

export const PhotoActionSheet = forwardRef<BottomSheetModal, PhotoActionSheetProps>(
  function PhotoActionSheet({ onTakePhoto, onChoosePhoto, onDeletePhoto }, ref) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();

    const dismiss = useCallback(() => {
      if (ref && 'current' in ref) ref.current?.dismiss();
    }, [ref]);

    const handleAction = useCallback(
      (action: () => void) => () => {
        dismiss();
        action();
      },
      [dismiss],
    );

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
        <BottomSheetView style={[styles.container, { paddingBottom: Math.max(24, insets.bottom + 8) }]}>
          <Pressable style={styles.row} onPress={handleAction(onTakePhoto)}>
            <Ionicons name="camera-outline" size={22} color={styles.rowText.color} />
            <Text style={styles.rowText}>Take Photo</Text>
          </Pressable>

          <View style={styles.separator} />

          <Pressable style={styles.row} onPress={handleAction(onChoosePhoto)}>
            <Ionicons name="images-outline" size={22} color={styles.rowText.color} />
            <Text style={styles.rowText}>Choose Photo</Text>
          </Pressable>

          <View style={styles.separator} />

          <Pressable style={styles.row} onPress={handleAction(onDeletePhoto)}>
            <Ionicons name="trash-outline" size={22} color="#ED2F3C" />
            <Text style={[styles.rowText, styles.rowTextDestructive]}>Delete Photo</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
