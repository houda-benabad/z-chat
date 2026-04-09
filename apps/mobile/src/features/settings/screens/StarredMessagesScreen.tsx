import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { useStarredMessages } from '../hooks/useStarredMessages';
import { formatMessageTime } from '@/shared/utils';
import { MESSAGE_TYPE_LABELS } from '@/constants';
import { createStyles } from './styles/StarredMessagesScreen.styles';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import type { StarredMessageItem } from '@/types';

export default function StarredMessagesScreen() {
  const styles = useThemedStyles(createStyles);
  const { appColors } = useAppSettings();
  const router = useRouter();
  const { starred, loading, loadingMore, hasMore, loadMore, handleUnstar } = useStarredMessages();

  const getPreview = (item: StarredMessageItem) => {
    const msg = item.message;
    if (msg.isDeleted) return 'This message was deleted';
    if (msg.type !== 'text') return MESSAGE_TYPE_LABELS[msg.type] ?? msg.type;
    return msg.content ?? '';
  };

  const renderItem = ({ item }: { item: StarredMessageItem }) => {
    const msg = item.message;
    const senderName = msg.sender?.name ?? 'Unknown';
    const chatName = msg.chat.type === 'group' ? (msg.chat.name ?? 'Group') : senderName;

    return (
      <Pressable
        style={styles.messageRow}
        onPress={() => {
          const isGroup = msg.chat.type === 'group';
          router.push({
            pathname: '/chat',
            params: {
              chatId: msg.chatId,
              name: chatName,
              messageId: msg.id,
              ...(isGroup ? { chatType: 'group', recipientAvatar: msg.chat.avatar ?? '' } : {}),
            },
          } as any);
        }}
      >
        <View style={styles.messageContent}>
          <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
          {msg.chat.type === 'group' && (
            <Text style={styles.chatName} numberOfLines={1}>{msg.chat.name ?? 'Group'}</Text>
          )}
          <Text style={styles.preview} numberOfLines={2}>{getPreview(item)}</Text>
          <Text style={styles.time}>{formatMessageTime(msg.createdAt)}</Text>
        </View>
        <Pressable style={styles.unstarButton} onPress={() => handleUnstar(item)}>
          <Ionicons name="star" size={20} color="#F1A167" />
        </Pressable>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Starred Messages</Text>
      </View>

      <FlatList
        data={starred}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={starred.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No starred messages</Text>
            <Text style={styles.emptySubtitle}>
              Tap and hold any message to star it
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={appColors.primary} />
            </View>
          ) : null
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
}
