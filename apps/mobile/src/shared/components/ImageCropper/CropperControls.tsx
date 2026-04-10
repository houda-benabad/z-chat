import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/CropperControls.styles';

interface CropperControlsProps {
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CropperControls({
  processing,
  onConfirm,
  onCancel,
}: CropperControlsProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable onPress={onCancel} style={styles.cancelButton} disabled={processing}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>

      <Pressable
        onPress={onConfirm}
        style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
        disabled={processing}
      >
        {processing ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name="checkmark" size={28} color="#FFFFFF" />
        )}
      </Pressable>
    </View>
  );
}
