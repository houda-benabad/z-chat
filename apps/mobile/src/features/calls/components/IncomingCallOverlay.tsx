import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/IncomingCallOverlay.styles';
import type { CallUser, CallType } from '@/types';

interface Props {
  caller: CallUser;
  callType: CallType;
  isGroup: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallOverlay({ caller, callType, isGroup, onAccept, onReject }: Props) {
  const styles = useThemedStyles(createStyles);
  const initial = (caller.name ?? caller.phone)?.[0]?.toUpperCase() ?? '?';
  const subtitle = isGroup
    ? `Incoming group ${callType === 'VIDEO' ? 'video' : 'voice'} call...`
    : `Incoming ${callType === 'VIDEO' ? 'video' : 'voice'} call...`;

  return (
    <View style={styles.overlay}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.name}>{caller.name ?? caller.phone}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Ionicons name={callType === 'VIDEO' ? 'videocam' : 'call'} size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
