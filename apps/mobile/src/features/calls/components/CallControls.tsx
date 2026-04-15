import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { createStyles } from './styles/CallControls.styles';

interface Props {
  isMuted: boolean;
  isSpeaker: boolean;
  isVideoEnabled: boolean;
  isVideoCall: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onHangup: () => void;
}

export function CallControls({
  isMuted,
  isSpeaker,
  isVideoEnabled,
  isVideoCall,
  onToggleMute,
  onToggleSpeaker,
  onToggleVideo,
  onSwitchCamera,
  onHangup,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonActive]}
        onPress={onToggleMute}
      >
        <Ionicons
          name={isMuted ? 'mic-off' : 'mic'}
          size={26}
          color={isMuted ? '#333' : '#fff'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isSpeaker && styles.buttonActive]}
        onPress={onToggleSpeaker}
      >
        <Ionicons
          name={isSpeaker ? 'volume-high' : 'volume-low'}
          size={26}
          color={isSpeaker ? '#333' : '#fff'}
        />
      </TouchableOpacity>

      {isVideoCall && (
        <>
          <TouchableOpacity
            style={[styles.button, !isVideoEnabled && styles.buttonActive]}
            onPress={onToggleVideo}
          >
            <Ionicons
              name={isVideoEnabled ? 'videocam' : 'videocam-off'}
              size={26}
              color={isVideoEnabled ? '#fff' : '#333'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onSwitchCamera}>
            <Ionicons name="camera-reverse" size={26} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.hangupButton} onPress={onHangup}>
        <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
      </TouchableOpacity>
    </View>
  );
}
