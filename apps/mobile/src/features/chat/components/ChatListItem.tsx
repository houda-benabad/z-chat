import { View, Text, Pressable } from 'react-native';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/shared/components';
import { formatChatPreviewTime } from '@/shared/utils';
import { getChatPreview, getOtherParticipantUser } from '../utils/messageUtils';
import { MAX_UNREAD_DISPLAY } from '@/constants';
import type { ChatListItem as ChatListItemType } from '@/types';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ChatListItem.styles';

interface Props {
  item: ChatListItemType;
  nicknames: Map<string, string | null>;
  myUserId: string;
  onPress: (item: ChatListItemType) => void;
  onDelete: (chatId: string) => void;
  swipeActiveRef: React.MutableRefObject<boolean>;
  onSwipeableRef: (chatId: string, ref: Swipeable | null) => void;
}

export function ChatListItem({
  item,
  nicknames,
  myUserId,
  onPress,
  onDelete,
  swipeActiveRef,
  onSwipeableRef,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const isGroup = item.type === 'group';
  const otherUser = isGroup ? null : getOtherParticipantUser(item.participants, myUserId);
  const inContacts = otherUser ? nicknames.has(otherUser.id) : false;
  const nickname   = otherUser ? (nicknames.get(otherUser.id) ?? null) : null;
  const displayName = isGroup
    ? (item.name ?? 'Group')
    : inContacts
      ? (nickname ?? otherUser?.name ?? 'Unknown')
      : (otherUser?.phone ?? 'Unknown');
  const avatarUri = isGroup ? item.avatar : (otherUser?.avatar ?? null);
  const isOnline = !isGroup && (otherUser?.isOnline ?? false);
  const preview = getChatPreview(item.lastMessage, isGroup, myUserId); // ! I am on here - -
  const hasUnread = item.unreadCount > 0;

  const renderDeleteAction = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => onDelete(item.id)}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={(ref) => onSwipeableRef(item.id, ref)}
      renderRightActions={renderDeleteAction}
      onSwipeableWillOpen={() => { swipeActiveRef.current = true; }}
      onSwipeableClose={() => { swipeActiveRef.current = false; }}
      overshootRight={false}
      rightThreshold={80}
    >
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => { if (!swipeActiveRef.current) onPress(item); }} // ! i am on here
      >
        <Avatar
          uri={avatarUri}
          name={displayName}
          size={50}
          isOnline={isOnline}
          isGroup={isGroup}
          style={styles.avatar}
        />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {item.lastMessage && (
              <Text style={[styles.time, hasUnread && styles.timeUnread]}>
                {formatChatPreviewTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {hasUnread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > MAX_UNREAD_DISPLAY
                    ? `${MAX_UNREAD_DISPLAY}+`
                    : item.unreadCount}
                </Text>
              </View>
            ) : item.isPinned ? (
              <Ionicons name="pin" size={14} style={styles.pin} />
            ) : null}
          </View>
        </View>

        {/* Indented separator */}
        <View style={styles.separator} />
      </Pressable>
    </Swipeable>
  );
}
