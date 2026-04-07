import { Pressable, Text } from 'react-native';
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
    <Pressable
      style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}
      onPress={onUnblock}
    >
      <Ionicons name="ban" size={16} color="#ED2F3C" style={{ marginRight: 8 }} />
      <Text style={styles.text}>You blocked this contact. </Text>
      <Text style={styles.unblock}>Unblock</Text>
    </Pressable>
  );
}
