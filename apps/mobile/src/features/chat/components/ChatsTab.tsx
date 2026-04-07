import { useCallback, useRef } from 'react';
import { FlatList, RefreshControl, ActivityIndicator, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { EmptyState } from '@/shared/components';
import { ChatListItem } from './ChatListItem';
import { createStyles } from '../screens/styles/ChatListScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import type { ChatListItem as ChatListItemType } from '@/types';

interface ChatsTabProps {
  chats: ChatListItemType[];
  nicknames: Map<string, string>;
  myUserId: string;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  navHeight: number;
  onRefresh: () => Promise<void>;
  onDelete: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => void;
  onLoadMore: () => Promise<void>;
}

export function ChatsTab({
  chats,
  nicknames,
  myUserId,
  refreshing,
  loadingMore,
  hasMore,
  navHeight,
  onRefresh,
  onDelete,
  markAsRead,
  onLoadMore,
}: ChatsTabProps) {
  const styles = useThemedStyles(createStyles);
  const { appColors: colors } = useAppSettings();
  const router         = useRouter();
  const swipeableRefs  = useRef<Map<string, Swipeable | null>>(new Map());
  const swipeActiveRef = useRef(false);

  const handleChatPress = useCallback((item: ChatListItemType) => {
    const isGroup   = item.type === 'group';
    const otherUser = isGroup
      ? null
      : item.participants.find((p) => p.userId !== myUserId)?.user ?? null;

    const nickname    = otherUser ? (nicknames.get(otherUser.id) ?? null) : null;
    const displayName = isGroup
      ? (item.name ?? 'Group')
      : (nickname ?? otherUser?.name ?? otherUser?.phone ?? 'Unknown');

    markAsRead(item.id);

    router.push({
      pathname: '/chat',
      params: {
        chatId: item.id,
        name: displayName,
        ...(isGroup
          ? { chatType: 'group', recipientAvatar: item.avatar ?? '' }
          : {
              recipientId:       otherUser?.id ?? '',
              recipientAvatar:   otherUser?.avatar ?? '',
              recipientIsOnline: otherUser?.isOnline ? '1' : '0',
            }),
      },
    });
  }, [myUserId, nicknames, markAsRead, router]);

  return (
    <FlatList
      data={chats}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatListItem
          item={item}
          nicknames={nicknames}
          myUserId={myUserId}
          onPress={handleChatPress}
          onDelete={onDelete}
          swipeActiveRef={swipeActiveRef}
          onSwipeableRef={(id, ref) => swipeableRefs.current.set(id, ref)}
        />
      )}
      contentContainerStyle={[
        chats.length === 0 && styles.emptyContainer,
        { paddingBottom: navHeight + 72 },
      ]}
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title="No conversations yet"
          subtitle="Tap the button below to start a new chat"
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.3}
    />
  );
}
