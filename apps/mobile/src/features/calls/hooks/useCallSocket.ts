import { useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/shared/services/socket';
import type { CallType, IncomingCallData } from '@/types';

interface UseCallSocketOptions {
  onIncomingCall?: (data: IncomingCallData) => void;
  onCallAccepted?: (data: { callId: string; calleeId: string }) => void;
  onCallRejected?: (data: { callId: string; calleeId: string }) => void;
  onCallEnded?: (data: { callId: string; endReason: string }) => void;
  onCallBusy?: (data: { callId: string; calleeId: string }) => void;
  onCallTimeout?: (data: { callId: string }) => void;
}

export function useCallSocket(options: UseCallSocketOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = (data: IncomingCallData) => optionsRef.current.onIncomingCall?.(data);
    const handleAccepted = (data: { callId: string; calleeId: string }) => optionsRef.current.onCallAccepted?.(data);
    const handleRejected = (data: { callId: string; calleeId: string }) => optionsRef.current.onCallRejected?.(data);
    const handleEnded = (data: { callId: string; endReason: string }) => optionsRef.current.onCallEnded?.(data);
    const handleBusy = (data: { callId: string; calleeId: string }) => optionsRef.current.onCallBusy?.(data);
    const handleTimeout = (data: { callId: string }) => optionsRef.current.onCallTimeout?.(data);

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);
    socket.on('call:busy', handleBusy);
    socket.on('call:timeout', handleTimeout);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
      socket.off('call:busy', handleBusy);
      socket.off('call:timeout', handleTimeout);
    };
  }, []);

  const initiateCall = useCallback((data: {
    calleeId?: string;
    chatId?: string;
    type: CallType;
    isGroup?: boolean;
  }): Promise<{ call: { id: string; channelName: string }; token: string; channelName: string } | { error: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        resolve({ error: 'Not connected' });
        return;
      }
      socket.emit('call:initiate', data, (response: unknown) => {
        resolve(response as { call: { id: string; channelName: string }; token: string; channelName: string } | { error: string });
      });
    });
  }, []);

  const acceptCall = useCallback((callId: string): Promise<{ call: unknown; token: string; channelName: string } | { error: string }> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      if (!socket) {
        resolve({ error: 'Not connected' });
        return;
      }
      socket.emit('call:accept', { callId }, (response: unknown) => {
        resolve(response as { call: unknown; token: string; channelName: string } | { error: string });
      });
    });
  }, []);

  const rejectCall = useCallback((callId: string): void => {
    getSocket()?.emit('call:reject', { callId }, () => {});
  }, []);

  const hangup = useCallback((callId: string): void => {
    getSocket()?.emit('call:hangup', { callId }, () => {});
  }, []);

  const reportBusy = useCallback((callId: string): void => {
    getSocket()?.emit('call:busy', { callId }, () => {});
  }, []);

  return { initiateCall, acceptCall, rejectCall, hangup, reportBusy };
}
