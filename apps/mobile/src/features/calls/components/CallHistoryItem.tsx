import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/CallHistoryItem.styles';
import { formatCallDuration, isMissedCall } from '../utils/callHelpers';
import type { CallRecord } from '@/types';

interface Props {
  call: CallRecord;
  currentUserId: string;
  onPress: (call: CallRecord) => void;
}

export function CallHistoryItem({ call, currentUserId, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const isCaller = call.callerId === currentUserId;
  const otherUser = isCaller ? call.callee : call.caller;
  const missed = isMissedCall(call.status, currentUserId, call.calleeId);
  const initial = (otherUser?.name ?? otherUser?.phone)?.[0]?.toUpperCase() ?? '?';

  const date = new Date(call.startedAt);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(call)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, missed && styles.nameMissed]} numberOfLines={1}>
            {otherUser?.name ?? otherUser?.phone ?? 'Group call'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons
            name={isCaller ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={missed ? '#ED2F3C' : '#4CAF50'}
          />
          <Text style={styles.detail}>
            {call.type === 'VIDEO' ? 'Video' : 'Voice'}
            {call.duration != null ? ` \u00B7 ${formatCallDuration(call.duration)}` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.time}>{`${dateStr} ${timeStr}`}</Text>

      <TouchableOpacity style={styles.callBtn} onPress={() => onPress(call)}>
        <Ionicons
          name={call.type === 'VIDEO' ? 'videocam-outline' : 'call-outline'}
          size={22}
          color="#4D7E82"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
