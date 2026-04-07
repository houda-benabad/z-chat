import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { userApi, contactApi, settingsApi } from '@/shared/services/api';
import { formatLastSeen } from '@/shared/utils';
import type { PublicUserProfile } from '@/types';

export { formatLastSeen };

export interface UseUserProfileReturn {
  profile: PublicUserProfile | null;
  loading: boolean;
  contactId: string | null;
  menuVisible: boolean;
  setMenuVisible: (v: boolean) => void;
  actionError: string | null;
  actionDone: string | null;
  actionLoading: boolean;
  isBlocked: boolean;
  fadeAnim: Animated.Value;
  displayName: string;
  handleBlock: () => void;
  handleUnblock: () => void;
  handleDeleteContact: () => Promise<void>;
  handleAddContact: () => void;
}

export function useUserProfile(): UseUserProfileReturn {
  const router = useRouter();
  const { userId, name: paramName, contactId: paramContactId } = useLocalSearchParams<{
    userId: string;
    name?: string;
    contactId?: string;
  }>();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactId, setContactId] = useState<string | null>(paramContactId ?? null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const displayName = profile?.name ?? paramName ?? 'Unknown';

  useEffect(() => {
    if (!userId) return;
    userApi.getUser(userId)
      .then(({ user }) => setProfile(user))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (!paramContactId) {
      contactApi.getContacts().then(({ contacts }) => {
        const match = contacts.find((c) => c.contactUserId === userId);
        if (match) setContactId(match.id);
      }).catch(() => {});
    }
    settingsApi.getBlocked().then(({ blocked }) => {
      setIsBlocked(blocked.some((b) => b.blockedUserId === userId));
    }).catch(() => {});
  }, [userId, paramContactId]);

  const showToast = useCallback((msg: string) => {
    setActionDone(msg);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setActionDone(null));
  }, [fadeAnim]);

  const handleBlock = useCallback(() => {
    setMenuVisible(false);
    setTimeout(() => Alert.alert(
      'Block Contact',
      `Block ${displayName}? They won't be able to send you messages or calls.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await settingsApi.blockUser(userId);
              setIsBlocked(true);
              showToast(`${displayName} blocked`);
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Failed to block user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    ), 300);
  }, [displayName, userId, showToast]);

  const handleUnblock = useCallback(() => {
    setMenuVisible(false);
    setTimeout(() => Alert.alert(
      'Unblock Contact',
      `Unblock ${displayName}? They'll be able to message and call you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setActionLoading(true);
            try {
              await settingsApi.unblockUser(userId);
              setIsBlocked(false);
              showToast(`${displayName} unblocked`);
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Failed to unblock user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    ), 300);
  }, [displayName, userId, showToast]);

  const handleDeleteContact = useCallback(async () => {
    setMenuVisible(false);
    if (!contactId) { setActionError('Not in your contacts'); return; }
    try {
      await contactApi.deleteContact(contactId);
      showToast('Contact removed');
      setContactId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove contact');
    }
  }, [contactId, showToast]);

  const handleAddContact = useCallback(() => {
    setMenuVisible(false);
    const params = new URLSearchParams();
    if (profile?.phone) params.set('prefillPhone', profile.phone);
    if (profile?.name) params.set('prefillName', profile.name);
    router.push(`/add-contact?${params.toString()}`);
  }, [profile, router]);

  return {
    profile,
    loading,
    contactId,
    menuVisible,
    setMenuVisible,
    actionError,
    actionDone,
    actionLoading,
    isBlocked,
    fadeAnim,
    displayName,
    handleBlock,
    handleUnblock,
    handleDeleteContact,
    handleAddContact,
  };
}
