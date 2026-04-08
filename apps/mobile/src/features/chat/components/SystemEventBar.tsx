import { View, Text } from 'react-native';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { resolveSystemText } from '../utils/resolveSystemText';
import { createStyles } from './styles/SystemEventBar.styles';
import type { ChatMessage } from '@/types';

interface SystemEventBarProps {
  message: ChatMessage;
  myUserId: string;
  resolveName?: (userId: string) => string | null;
}

export function SystemEventBar({ message, myUserId, resolveName }: SystemEventBarProps) {
  const styles = useThemedStyles(createStyles);
  const text = resolveSystemText(message.content, myUserId, resolveName);

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}
