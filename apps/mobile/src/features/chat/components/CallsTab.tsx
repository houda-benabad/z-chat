import { View, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/shared/components';
import { useCurrentUser } from '@/shared/hooks';
import { useCallHistory } from '@/features/calls/hooks';
import { CallHistoryItem } from '@/features/calls/components/CallHistoryItem';
import { createStyles } from '../screens/styles/ChatListScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import type { CallRecord } from '@/types';

export function CallsTab() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { calls, loading, refreshing, hasMore, refresh, loadMore } = useCallHistory();

  const handleCallPress = (call: CallRecord) => {
    const isCaller = call.callerId === userId;
    const otherUser = isCaller ? call.callee : call.caller;
    router.push({
      pathname: '/call',
      params: {
        calleeId: otherUser?.id ?? '',
        callerName: otherUser?.name ?? otherUser?.phone ?? 'Unknown',
        isVideo: call.type === 'VIDEO' ? 'true' : 'false',
        chatId: call.chatId ?? '',
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (calls.length === 0) {
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

  return (
    <FlatList
      data={calls}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CallHistoryItem
          call={item}
          currentUserId={userId}
          onPress={handleCallPress}
        />
      )}
      onRefresh={refresh}
      refreshing={refreshing}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 16 }} /> : null}
    />
  );
}
