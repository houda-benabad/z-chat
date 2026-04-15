import { useState, useCallback, useRef, useEffect } from 'react';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

// Lazy-load Agora SDK — returns null if native module isn't available (Expo Go)
let _agora: typeof import('react-native-agora') | null = null;
let _agoraChecked = false;

function getAgora() {
  if (!_agoraChecked) {
    _agoraChecked = true;
    try {
      _agora = require('react-native-agora');
    } catch {
      _agora = null;
    }
  }
  return _agora;
}

export type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';

/** True if the Agora native module is available (dev build). False in Expo Go. */
export function isAgoraAvailable(): boolean {
  return getAgora() != null;
}

interface UseCallReturn {
  callState: CallState;
  isMuted: boolean;
  isSpeaker: boolean;
  isVideoEnabled: boolean;
  remoteUids: number[];
  callDuration: number;
  agoraAvailable: boolean;
  joinChannel: (channelName: string, token: string, uid: number) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  setCallState: (state: CallState) => void;
}

export function useCall(isVideo: boolean): UseCallReturn {
  const agora = getAgora();
  const engineRef = useRef<any>(null);
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initEngine = useCallback(async () => {
    if (!agora) return null;
    if (engineRef.current) return engineRef.current;

    const engine = agora.createAgoraRtcEngine();
    engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: agora.ChannelProfileType.ChannelProfileCommunication,
    });

    engine.registerEventHandler({
      onUserJoined: (_connection: unknown, remoteUid: number) => {
        setRemoteUids((prev) => (prev.includes(remoteUid) ? prev : [...prev, remoteUid]));
      },
      onUserOffline: (_connection: unknown, remoteUid: number) => {
        setRemoteUids((prev) => prev.filter((uid) => uid !== remoteUid));
      },
      onJoinChannelSuccess: () => {
        setCallState('connected');
        startTimer();
      },
      onConnectionLost: () => {
        setCallState('ended');
        stopTimer();
      },
    });

    engine.setClientRole(agora.ClientRoleType.ClientRoleBroadcaster);
    engine.enableAudio();

    if (isVideo) {
      engine.enableVideo();
      engine.startPreview();
    }

    engineRef.current = engine;
    return engine;
  }, [agora, isVideo, startTimer, stopTimer]);

  const joinChannel = useCallback(async (channelName: string, token: string, uid: number) => {
    if (!agora) return;
    const engine = await initEngine();
    if (!engine) return;
    setCallState('connecting');
    engine.joinChannel(token, channelName, uid, {
      clientRoleType: agora.ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: isVideo,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });
  }, [agora, initEngine, isVideo]);

  const leaveChannel = useCallback(async () => {
    stopTimer();
    setCallState('ended');
    setRemoteUids([]);

    if (engineRef.current) {
      engineRef.current.leaveChannel();
      engineRef.current.release();
      engineRef.current = null;
    }
  }, [stopTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      engineRef.current?.muteLocalAudioStream(!prev);
      return !prev;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      engineRef.current?.setEnableSpeakerphone(!prev);
      return !prev;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      if (prev) {
        engineRef.current?.muteLocalVideoStream(true);
      } else {
        engineRef.current?.enableVideo();
        engineRef.current?.muteLocalVideoStream(false);
        engineRef.current?.startPreview();
      }
      return !prev;
    });
  }, []);

  const switchCamera = useCallback(() => {
    engineRef.current?.switchCamera();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, [stopTimer]);

  return {
    callState,
    isMuted,
    isSpeaker,
    isVideoEnabled,
    remoteUids,
    callDuration,
    agoraAvailable: agora != null,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    switchCamera,
    setCallState,
  };
}
