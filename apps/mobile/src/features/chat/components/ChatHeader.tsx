import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ChatHeader.styles';

const DEFAULT_AVATAR = require('../../../../assets/default-avatar.png');

interface ChatHeaderProps {
  name: string;
  recipientAvatar?: string;
  isOnline: boolean;
  isTyping: boolean;
  isGroup: boolean;
  isBlocked?: boolean;
  isSearchOpen?: boolean;
  topInset: number;
  typingLabel?: string;
  onBack: () => void;
  onHeaderPress?: () => void;
  onSearchPress?: () => void;
}

export function ChatHeader({
  name,
  recipientAvatar,
  isOnline,
  isTyping,
  isGroup,
  isBlocked,
  isSearchOpen,
  topInset,
  typingLabel,
  onBack,
  onHeaderPress,
  onSearchPress,
}: ChatHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const statusText = isBlocked
    ? ''
    : isTyping
    ? (typingLabel ?? 'typing...')
    : isGroup
    ? 'tap for group info'
    : isOnline
    ? 'online'
    : '';

  return (
    <LinearGradient
      colors={['#E46C53', 'rgba(228,108,83,0.93)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: topInset + 10 }]}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <Pressable style={styles.info} onPress={onHeaderPress}>
        <View style={styles.avatar}>
          {recipientAvatar ? (
            <Image source={{ uri: recipientAvatar }} style={styles.avatarImage} />
          ) : (
            <Image source={DEFAULT_AVATAR} style={styles.avatarImage} />
          )}
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {!!statusText && <Text style={styles.status}>{statusText}</Text>}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable hitSlop={10} style={styles.actionBtn}>
          <Ionicons name="videocam-outline" size={22} color="#fff" />
        </Pressable>
        <Pressable hitSlop={10} style={styles.actionBtn}>
          <Ionicons name="call-outline" size={20} color="#fff" />
        </Pressable>
        {onSearchPress && (
          <Pressable hitSlop={10} style={styles.actionBtn} onPress={onSearchPress}>
            <Ionicons name={isSearchOpen ? 'close-outline' : 'search-outline'} size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
