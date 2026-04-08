import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { TextInput, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import { contactApi } from '@/shared/services/api';
import { getContactDisplayName, groupContactsByLetter } from '@/shared/utils';
import type { ContactItem } from '@/types';

export interface UseNewChatReturn {
  contacts: ContactItem[];
  sections: { title: string; data: ContactItem[] }[];
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  loadError: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  syncing: boolean;
  openingId: string | null;
  searchRef: React.RefObject<TextInput>;
  onRefresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  handleSelectContact: (contact: ContactItem) => Promise<void>;
  handleSyncContacts: () => Promise<void>;
}

export function useNewChat(): UseNewChatReturn {
  const router = useRouter();
  const { forwardContent } = useLocalSearchParams<{ forwardContent?: string }>();
  const searchRef = useRef<TextInput>(null);

  const PAGE_SIZE = 50;

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoadError(false);
    try {
      const { contacts: data, hasMore: more } = await contactApi.getContacts(0, PAGE_SIZE);
      setContacts(data);
      setHasMore(more);
    } catch {
      setLoadError(true);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { contacts: data, hasMore: more } = await contactApi.getContacts(contacts.length, PAGE_SIZE);
      setContacts((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        return [...prev, ...data.filter((c) => !existingIds.has(c.id))];
      });
      setHasMore(more);
    } catch { /* silently ignore */ }
    finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, contacts.length]);

  useEffect(() => {
    const init = async () => {
      await loadContacts();
      setLoading(false);
      setTimeout(() => searchRef.current?.focus(), 350);
    };
    init();
  }, [loadContacts]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) loadContacts();
    }, [loading, loadContacts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const handleSelectContact = useCallback((contact: ContactItem) => {
    if (openingId) return;
    setOpeningId(contact.id);
    router.replace({
      pathname: '/chat',
      params: {
        chatId: '',
        name: contact.nickname ?? contact.contactUser.name ?? contact.contactUser.phone ?? 'Chat',
        recipientId: contact.contactUserId,
        recipientAvatar: contact.contactUser.avatar ?? '',
        recipientIsOnline: contact.contactUser.isOnline ? '1' : '0',
        ...(forwardContent ? { forwardContent } : {}),
      },
    });
  }, [router, openingId, forwardContent]);

  const handleSyncContacts = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow contact access to find friends on z.chat');
      return;
    }
    setSyncing(true);
    try {
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const phones: string[] = [];
      for (const c of data) {
        for (const p of c.phoneNumbers ?? []) {
          if (p.number) phones.push(p.number.replace(/\s+/g, ''));
        }
      }
      if (phones.length === 0) {
        Alert.alert('No phone contacts', 'No phone numbers found in your contacts.');
        return;
      }
      const { users } = await contactApi.syncContacts(phones);
      const newCount = users.filter((u) => !u.isContact).length;
      if (newCount > 0) {
        Alert.alert('Sync complete', `Found ${newCount} new contact(s) on z.chat`);
        await loadContacts();
      } else {
        Alert.alert('Up to date', 'No new contacts found on z.chat');
      }
    } catch {
      Alert.alert('Sync failed', 'Could not sync contacts. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [loadContacts]);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? contacts.filter((c) => {
        const name = getContactDisplayName(c).toLowerCase();
        return name.includes(q) || c.contactUser.phone.includes(q);
      })
    : contacts;

  const sections = groupContactsByLetter(filtered);

  return {
    contacts,
    sections,
    search,
    setSearch,
    loading,
    loadError,
    refreshing,
    loadingMore,
    hasMore,
    syncing,
    openingId,
    searchRef,
    onRefresh,
    loadMore,
    handleSelectContact,
    handleSyncContacts,
  };
}
