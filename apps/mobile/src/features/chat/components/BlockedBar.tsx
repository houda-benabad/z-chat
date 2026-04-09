import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/BlockedBar.styles';

interface BlockedBarProps {
  onUnblock: () => void;
  bottomInset: number;
}

export function BlockedBar({ onUnblock, bottomInset }: BlockedBarProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <Text style={styles.notice}>
        You can no longer send messages to this contact.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.unblockBtn, pressed && styles.unblockBtnPressed]}
        onPress={onUnblock}
      >
        <Ionicons name="ban" size={14} color="#ED2F3C" style={{ marginRight: 6 }} />
        <Text style={styles.unblockText}>UNBLOCK</Text>
      </Pressable>
    </View>
  );
}
