import { useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useCallSocket } from '../hooks/useCallSocket';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import type { IncomingCallData } from '@/types';

interface Props {
  children: ReactNode;
}

export function CallProvider({ children }: Props) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const { acceptCall, rejectCall } = useCallSocket({
    onIncomingCall: useCallback((data: IncomingCallData) => {
      setIncomingCall(data);
    }, []),
    onCallEnded: useCallback(() => {
      setIncomingCall(null);
    }, []),
    onCallTimeout: useCallback(() => {
      setIncomingCall(null);
    }, []),
  });

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    const result = await acceptCall(incomingCall.callId);
    setIncomingCall(null);

    if ('error' in result) return;

    router.push({
      pathname: '/call',
      params: {
        callId: incomingCall.callId,
        channelName: result.channelName,
        token: result.token,
        uid: '1',
        isVideo: incomingCall.type === 'VIDEO' ? 'true' : 'false',
        callerName: incomingCall.caller.name ?? incomingCall.caller.phone,
        isIncoming: 'true',
      },
    });
  }, [incomingCall, acceptCall, router]);

  const handleReject = useCallback(() => {
    if (!incomingCall) return;
    rejectCall(incomingCall.callId);
    setIncomingCall(null);
  }, [incomingCall, rejectCall]);

  return (
    <>
      {children}
      {incomingCall && (
        <IncomingCallOverlay
          caller={incomingCall.caller}
          callType={incomingCall.type}
          isGroup={incomingCall.isGroup}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
}
