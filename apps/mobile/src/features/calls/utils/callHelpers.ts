import type { CallStatus } from '@/types';

export function formatCallDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatElapsedTime(startTime: number): string {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return formatCallDuration(elapsed);
}

export function getCallStatusLabel(status: CallStatus, isCaller: boolean): string {
  switch (status) {
    case 'ENDED': return 'Call ended';
    case 'MISSED': return isCaller ? 'No answer' : 'Missed call';
    case 'REJECTED': return isCaller ? 'Call declined' : 'Declined';
    case 'NO_ANSWER': return 'No answer';
    case 'BUSY': return 'Busy';
    default: return '';
  }
}

export function isMissedCall(status: CallStatus, userId: string, calleeId: string | null): boolean {
  return (status === 'MISSED' || status === 'NO_ANSWER') && userId === calleeId;
}
