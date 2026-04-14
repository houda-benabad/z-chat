import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { TextInput } from 'react-native';
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
  openingId: string | null;
  searchRef: React.RefObject<TextInput>;
  onRefresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  handleSelectContact: (contact: ContactItem) => Promise<void>;
}

export function useNewChat(): UseNewChatReturn {
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);

  const PAGE_SIZE = 50;

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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
      },
    });
  }, [router, openingId]);

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
    openingId,
    searchRef,
    onRefresh,
    loadMore,
    handleSelectContact,
  };
}
