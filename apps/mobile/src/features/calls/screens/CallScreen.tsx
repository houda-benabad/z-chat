import { useEffect, useCallback, type ComponentType } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/shared/hooks/useThemedStyles';
import { useCall } from '../hooks/useCall';
import { useCallSocket } from '../hooks/useCallSocket';
import { CallControls } from '../components/CallControls';
import { CallTimer } from '../components/CallTimer';
import { createStyles } from './styles/CallScreen.styles';

// Lazy-load RtcSurfaceView — null in Expo Go
let RtcSurfaceView: ComponentType<any> | null = null;
try {
  RtcSurfaceView = require('react-native-agora').RtcSurfaceView;
} catch {
  // Not available in Expo Go
}

export function CallScreen() {
  const params = useLocalSearchParams<{
    callId: string;
    channelName: string;
    token: string;
    uid: string;
    isVideo: string;
    callerName: string;
    isIncoming: string;
  }>();

  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const isVideo = params.isVideo === 'true';
  const uid = Number(params.uid) || 0;

  const {
    callState,
    isMuted,
    isSpeaker,
    isVideoEnabled,
    remoteUids,
    callDuration,
    agoraAvailable,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    switchCamera,
  } = useCall(isVideo);

  const { hangup } = useCallSocket({
    onCallEnded: () => {
      leaveChannel();
      router.back();
    },
    onCallRejected: () => {
      leaveChannel();
      router.back();
    },
    onCallTimeout: () => {
      leaveChannel();
      router.back();
    },
  });

  useEffect(() => {
    if (agoraAvailable && params.channelName && params.token) {
      joinChannel(params.channelName, params.token, uid);
    }
  }, []);

  const handleHangup = useCallback(() => {
    if (params.callId) {
      hangup(params.callId);
    }
    leaveChannel();
    router.back();
  }, [params.callId, hangup, leaveChannel, router]);

  const statusText = !agoraAvailable
    ? 'Dev build required for calls'
    : callState === 'connecting'
      ? 'Connecting...'
      : callState === 'ringing'
        ? 'Ringing...'
        : callState === 'ended'
          ? 'Call ended'
          : '';

  const initial = (params.callerName ?? '?')[0]?.toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {isVideo && remoteUids.length > 0 && RtcSurfaceView ? (
        <View style={styles.videoContainer}>
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{ uid: remoteUids[0] }}
          />
          {isVideoEnabled && (
            <View style={styles.localVideo}>
              <RtcSurfaceView
                style={{ flex: 1 }}
                canvas={{ uid: 0 }}
                zOrderMediaOverlay
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.voiceContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{params.callerName ?? 'Unknown'}</Text>
          {callState === 'connected' ? (
            <View style={styles.timerContainer}>
              <CallTimer seconds={callDuration} />
            </View>
          ) : (
            <Text style={styles.status}>{statusText}</Text>
          )}
        </View>
      )}

      <View style={styles.controlsContainer}>
        <CallControls
          isMuted={isMuted}
          isSpeaker={isSpeaker}
          isVideoEnabled={isVideoEnabled}
          isVideoCall={isVideo}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onHangup={handleHangup}
        />
      </View>
    </SafeAreaView>
  );
}
