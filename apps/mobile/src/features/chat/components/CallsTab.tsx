import { View } from 'react-native';
import { EmptyState } from '@/shared/components';
import { createStyles } from '../screens/styles/ChatListScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';

export function CallsTab() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon="call-outline"
        title="No calls yet"
        subtitle="Voice and video calls will appear here"
      />
    </View>
  );
}
