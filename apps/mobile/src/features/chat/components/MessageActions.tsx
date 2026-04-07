import { Modal, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/types';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/MessageActions.styles';

interface MessageActionsProps {
  message: ChatMessage | null;
  myUserId: string;
  visible: boolean;
  onClose: () => void;
  onReply: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
}

export function MessageActions({
  message,
  myUserId,
  visible,
  onClose,
  onReply,
  onDelete,
  onForward,
}: MessageActionsProps) {
  const styles = useThemedStyles(createStyles);
  if (!message) return null;

  const isMine = message.senderId === myUserId;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Pressable style={styles.action} onPress={() => { onReply(message); onClose(); }}>
            <Ionicons name="return-down-back-outline" size={20} color="#333" />
            <Text style={styles.actionText}>Reply</Text>
          </Pressable>

          <Pressable style={styles.action} onPress={() => { onForward(message); onClose(); }}>
            <Ionicons name="arrow-redo-outline" size={20} color="#333" />
            <Text style={styles.actionText}>Forward</Text>
          </Pressable>

          {isMine && !message.isDeleted && (
            <Pressable style={[styles.action, styles.actionDestructive]} onPress={() => { onDelete(message); onClose(); }}>
              <Ionicons name="trash-outline" size={20} color="#ED2F3C" />
              <Text style={[styles.actionText, styles.actionTextDestructive]}>Delete</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
