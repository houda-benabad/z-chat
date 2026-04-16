import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useUserProfile } from '@/shared/context/UserProfileContext';
import { useContactSync } from './useContactSync';

export type SyncState = 'initial' | 'syncing' | 'done' | 'denied';

export function useContactSyncScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { syncContacts, requestPermission, syncing, error } = useContactSync();
  const [state, setState] = useState<SyncState>('initial');
  const [matchedCount, setMatchedCount] = useState(0);
  const [totalContacts, setTotalContacts] = useState(0);

  const handleSync = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setState('denied');
      return;
    }

    setState('syncing');
    const userPhone = profile?.phone ?? '';
    const result = await syncContacts(userPhone);

    if (result) {
      setMatchedCount(result.matchedUsers.length);
      setTotalContacts(result.totalPhoneContacts);
    }
    setState('done');
  }, [requestPermission, syncContacts, profile]);

  const handleContinue = useCallback(() => {
    router.replace('/chat-list');
  }, [router]);

  const handleSkip = useCallback(() => {
    router.replace('/chat-list');
  }, [router]);

  return { state, matchedCount, totalContacts, syncing, error, handleSync, handleContinue, handleSkip };
}
