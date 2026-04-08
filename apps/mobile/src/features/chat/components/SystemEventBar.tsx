import { View, Text } from 'react-native';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { resolveSystemText } from '../utils/resolveSystemText';
import { createStyles } from './styles/SystemEventBar.styles';
import type { ChatMessage } from '@/types';

interface SystemEventBarProps {
  message: ChatMessage;
  myUserId: string;
}

export function SystemEventBar({ message, myUserId }: SystemEventBarProps) {
  const styles = useThemedStyles(createStyles);
  const text = resolveSystemText(message.content, myUserId);

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}
