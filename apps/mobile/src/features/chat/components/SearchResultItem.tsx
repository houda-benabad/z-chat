import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/shared/components';
import { useThemedStyles } from '@/shared/hooks';
import { formatMessageTime } from '@/shared/utils';
import { MESSAGE_TYPE_LABELS } from '@/constants';
import { createStyles } from './styles/SearchResultItem.styles';
import type { ChatMessage } from '@/types';

interface SearchResultItemProps {
  message: ChatMessage;
  query: string;
  onPress: (id: string) => void;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function SearchResultItem({ message, query, onPress }: SearchResultItemProps) {
  const styles = useThemedStyles(createStyles);

  const rawContent =
    message.type === 'text'
      ? (message.content ?? '')
      : (MESSAGE_TYPE_LABELS[message.type] ?? message.type);

  const renderContent = () => {
    if (!query.trim() || message.type !== 'text' || !rawContent) {
      return (
        <Text style={styles.preview} numberOfLines={2}>
          {rawContent}
        </Text>
      );
    }
    const lowerQuery = query.toLowerCase();
    const parts = rawContent.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
    return (
      <Text style={styles.preview} numberOfLines={2}>
        {parts.map((part, i) =>
          part.toLowerCase() === lowerQuery
            ? <Text key={i} style={styles.highlight}>{part}</Text>
            : part
        )}
      </Text>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      onPress={() => onPress(message.id)}
    >
      <Avatar
        uri={message.sender?.avatar}
        name={message.sender?.name ?? '?'}
        size={40}
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.senderName} numberOfLines={1}>
            {message.sender?.name ?? 'Unknown'}
          </Text>
          <Text style={styles.timestamp}>{formatMessageTime(message.createdAt)}</Text>
        </View>
        {renderContent()}
      </View>
    </Pressable>
  );
}
