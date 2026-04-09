import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/RemovedFromGroupBar.styles';

interface RemovedFromGroupBarProps {
  bottomInset: number;
}

export function RemovedFromGroupBar({ bottomInset }: RemovedFromGroupBarProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <Ionicons name="people-outline" size={16} color={styles.text.color as string} style={{ marginRight: 8 }} />
      <Text style={styles.text}>You were removed from this group</Text>
    </View>
  );
}
