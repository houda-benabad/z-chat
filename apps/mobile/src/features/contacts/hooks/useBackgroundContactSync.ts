import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Contacts from 'expo-contacts';
import { useUserProfile } from '@/shared/context/UserProfileContext';
import { useContactSync } from './useContactSync';

/**
 * Silently syncs phone book contacts:
 * - On mount (catches changes while app was closed)
 * - On AppState → active (catches changes while backgrounded)
 * - On phone book change via Contacts.addContactChangeListener
 *
 * Never prompts for permission — only syncs if already granted.
 */
export function useBackgroundContactSync(): void {
  const { profile } = useUserProfile();
  const { syncContacts, checkPermission } = useContactSync();
  const syncingRef = useRef(false);

  const doSync = async () => {
    if (syncingRef.current || !profile?.phone) return;

    const granted = await checkPermission();
    if (!granted) return;

    syncingRef.current = true;
    try {
      await syncContacts(profile.phone);
    } catch {
      // Silent — background sync should never surface errors
    } finally {
      syncingRef.current = false;
    }
  };

  // Sync on mount
  useEffect(() => {
    doSync();
  }, [profile?.phone]);

  // Sync when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') doSync();
    });
    return () => sub.remove();
  }, [profile?.phone]);

  // Sync when phone book changes
  useEffect(() => {
    const sub = Contacts.addChangeListener(() => {
      doSync();
    });
    return () => sub.remove();
  }, [profile?.phone]);
}
