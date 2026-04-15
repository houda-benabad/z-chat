import { View, Text, Pressable } from 'react-native';
import { Avatar } from '@/shared/components';
import type { ContactItem } from '@/types';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/ContactSearchItem.styles';

interface Props {
  contact: ContactItem;
  onPress: () => void;
}

export function ContactSearchItem({ contact, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const displayName = contact.nickname ?? contact.contactUser.name ?? contact.contactUser.phone;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Avatar
        uri={contact.contactUser.avatar}
        name={displayName}
        size={50}
        style={styles.avatar}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.phone} numberOfLines={1}>{contact.contactUser.phone}</Text>
      </View>
      <View style={styles.separator} />
    </Pressable>
  );
}
