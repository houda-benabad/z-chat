import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/UnknownContactBar.styles';

interface UnknownContactBarProps {
  onAdd: () => void;
  onBlock: () => void;
}

export function UnknownContactBar({ onAdd, onBlock }: UnknownContactBarProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Not in your contacts</Text>
      <View style={styles.actions}>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="person-add-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
        <Pressable style={styles.blockBtn} onPress={onBlock}>
          <Ionicons name="ban-outline" size={14} color="#ED2F3C" style={{ marginRight: 6 }} />
          <Text style={styles.blockText}>Block</Text>
        </Pressable>
      </View>
    </View>
  );
}
