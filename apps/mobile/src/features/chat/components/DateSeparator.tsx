import { View, Text } from 'react-native';
import { formatDateSeparator } from '@/shared/utils';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/DateSeparator.styles';

interface DateSeparatorProps {
  dateStr: string;
}

export function DateSeparator({ dateStr }: DateSeparatorProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{formatDateSeparator(dateStr)}</Text>
      </View>
    </View>
  );
}
