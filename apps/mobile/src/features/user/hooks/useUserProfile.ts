import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { userApi, contactApi, settingsApi, chatApi } from '@/shared/services/api';
import { formatLastSeen, confirm } from '@/shared/utils';
import type { PublicUserProfile } from '@/types';

export { formatLastSeen };

export interface UseUserProfileReturn {
  profile: PublicUserProfile | null;
  loading: boolean;
  userId: string;
  contactId: string | null;
  contactNickname: string | null;
  menuVisible: boolean;
  setMenuVisible: (v: boolean) => void;
  actionError: string | null;
  actionDone: string | null;
  actionLoading: boolean;
  isBlocked: boolean;
  fadeAnim: Animated.Value;
  displayName: string;
  editNameVisible: boolean;
  editNameValue: string;
  editNameLoading: boolean;
  setEditNameValue: (v: string) => void;
  handleOpenEditName: () => void;
  handleCloseEditName: () => void;
  handleSaveNickname: () => Promise<void>;
  handleBlock: () => Promise<void>;
  handleUnblock: () => Promise<void>;
  handleDeleteContact: () => Promise<void>;
  handleAddContact: () => void;
  handleMessagePress: () => Promise<void>;
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
  const [contactNickname, setContactNickname] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editNameLoading, setEditNameLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contactFetchIdRef = useRef(0);

  const displayName = contactNickname ?? profile?.name ?? paramName ?? 'Unknown';

  useEffect(() => {
    if (!userId) return;
    userApi.getUser(userId)
      .then(({ user }) => setProfile(user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const fetchId = ++contactFetchIdRef.current;
      contactApi.getContacts().then(({ contacts }) => {
        if (fetchId !== contactFetchIdRef.current) return;
        const match = contacts.find((c) => c.contactUserId === userId);
        setContactId(match ? match.id : null);
        setContactNickname(match?.nickname ?? null);
      }).catch(() => {});
      settingsApi.getBlocked().then(({ blocked }) => {
        setIsBlocked(blocked.some((b) => b.blockedUserId === userId));
      }).catch(() => {});
    }, [userId])
  );

  const showToast = useCallback((msg: string) => {
    setActionDone(msg);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setActionDone(null));
  }, [fadeAnim]);

  const handleBlock = useCallback(async () => {
    setMenuVisible(false);
    await new Promise((r) => setTimeout(r, 300));
    const ok = await confirm(
      'Block Contact',
      `Block ${displayName}? They won't be able to send you messages or calls.`,
      'Block',
      true,
    );
    if (!ok) return;
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
  }, [displayName, userId, showToast]);

  const handleUnblock = useCallback(async () => {
    setMenuVisible(false);
    await new Promise((r) => setTimeout(r, 300));
    const ok = await confirm(
      'Unblock Contact',
      `Unblock ${displayName}? They'll be able to message and call you again.`,
      'Unblock',
    );
    if (!ok) return;
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
  }, [displayName, userId, showToast]);

  const handleDeleteContact = useCallback(async () => {
    setMenuVisible(false);
    if (!contactId) { setActionError('Not in your contacts'); return; }
    try {
      await contactApi.deleteContact(contactId);
      contactFetchIdRef.current++; // invalidate any in-flight getContacts response
      showToast('Contact removed');
      setContactId(null);
      setContactNickname(null);
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

  const handleOpenEditName = useCallback(() => {
    setEditNameValue(contactNickname ?? profile?.name ?? '');
    setEditNameVisible(true);
  }, [contactNickname, profile?.name]);

  const handleCloseEditName = useCallback(() => {
    setEditNameVisible(false);
  }, []);

  const handleSaveNickname = useCallback(async () => {
    if (!contactId) return;
    setEditNameLoading(true);
    try {
      const { contact } = await contactApi.updateNickname(contactId, editNameValue.trim());
      setContactNickname(contact.nickname ?? null);
      setEditNameVisible(false);
      showToast('Name updated');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setEditNameLoading(false);
    }
  }, [contactId, editNameValue, showToast]);

  const handleMessagePress = useCallback(async () => {
    let chatId = '';
    try {
      const { chats } = await chatApi.getChats();
      const existing = chats.find(
        (c) => c.type === 'direct' && c.participants.some((p) => p.userId === userId),
      );
      if (existing) chatId = existing.id;
    } catch { /* fall through — open as new chat */ }
    router.replace({
      pathname: '/chat',
      params: {
        chatId,
        name: displayName,
        recipientId: userId,
        recipientAvatar: profile?.avatar ?? '',
        recipientIsOnline: profile?.isOnline ? '1' : '0',
        backTo: '/chat-list?tab=chats',
      },
    });
  }, [userId, displayName, profile, router]);

  return {
    profile,
    loading,
    userId,
    contactId,
    contactNickname,
    menuVisible,
    setMenuVisible,
    actionError,
    actionDone,
    actionLoading,
    isBlocked,
    fadeAnim,
    displayName,
    editNameVisible,
    editNameValue,
    editNameLoading,
    setEditNameValue,
    handleOpenEditName,
    handleCloseEditName,
    handleSaveNickname,
    handleBlock,
    handleUnblock,
    handleDeleteContact,
    handleAddContact,
    handleMessagePress,
  };
}
