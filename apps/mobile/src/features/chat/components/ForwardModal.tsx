import { Modal, View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/shared/components';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import { createStyles } from './styles/ForwardModal.styles';
import type { ForwardRecipient } from '../hooks/useForwardModal';

interface ForwardModalProps {
  visible: boolean;
  chats: ForwardRecipient[];
  selectedIds: Set<string>;
  search: string;
  sending: boolean;
  onSearch: (text: string) => void;
  onToggle: (chatId: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export function ForwardModal({
  visible,
  chats,
  selectedIds,
  search,
  sending,
  onSearch,
  onToggle,
  onSend,
  onClose,
}: ForwardModalProps) {
  const styles = useThemedStyles(createStyles);
  const { accentColor } = useAppSettings();

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Forward message to</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#555555" />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats…"
              placeholderTextColor="#AAAAAA"
              value={search}
              onChangeText={onSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            style={styles.list}
            data={chats}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyText}>No chats found</Text>
            }
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable style={styles.row} onPress={() => onToggle(item.id)}>
                  <Avatar uri={item.avatar} name={item.name} size={42} />
                  <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selected ? accentColor : '#CCCCCC'}
                  />
                </Pressable>
              );
            }}
          />

          {selectedIds.size > 0 && (
            <Pressable
              style={[styles.fab, { backgroundColor: accentColor }]}
              onPress={onSend}
              disabled={sending}
            >
              <Ionicons name="arrow-redo" size={24} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
