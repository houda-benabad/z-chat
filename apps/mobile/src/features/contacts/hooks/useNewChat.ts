import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Share, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ExpoContacts from 'expo-contacts';
import { contactApi } from '@/shared/services/api';
import { getContactDisplayName, groupContactsByLetter, normalizePhoneNumber, extractCountryCode } from '@/shared/utils';
import { useUserProfile } from '@/shared/context/UserProfileContext';
import type { ContactItem, PhoneBookContact } from '@/types';

export interface UseNewChatReturn {
  contacts: ContactItem[];
  sections: { title: string; data: ContactItem[] }[];
  inviteContacts: PhoneBookContact[];
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
  handleInvite: (contact: PhoneBookContact) => Promise<void>;
}

export function useNewChat(): UseNewChatReturn {
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);
  const { profile } = useUserProfile();

  const PAGE_SIZE = 50;

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [phoneBookContacts, setPhoneBookContacts] = useState<PhoneBookContact[]>([]);
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

  const loadPhoneBookContacts = useCallback(async () => {
    try {
      const { status } = await ExpoContacts.getPermissionsAsync();
      if (status !== 'granted') return;

      const { data } = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.PhoneNumbers, ExpoContacts.Fields.Name, ExpoContacts.Fields.Image],
      });

      const defaultCC = extractCountryCode(profile?.phone ?? '+1');
      const mapped: PhoneBookContact[] = [];
      const allNormalized = new Set<string>();

      for (const c of data) {
        if (!c.phoneNumbers?.length) continue;
        const raw = c.phoneNumbers.map((p) => p.number ?? '').filter(Boolean);
        const normalized = raw
          .map((r) => normalizePhoneNumber(r, defaultCC))
          .filter((n): n is string => n !== null);
        if (!normalized.length) continue;
        mapped.push({
          id: c.id ?? '',
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
          phones: raw,
          normalizedPhones: normalized,
          imageUri: c.image?.uri,
        });
        for (const n of normalized) allNormalized.add(n);
      }

      setPhoneBookContacts(mapped);

      // Quick sync: discover newly registered users and auto-add as contacts
      const userPhone = profile?.phone ?? '';
      const phones = Array.from(allNormalized).filter((p) => p !== userPhone);
      if (phones.length > 0) {
        try {
          const BATCH = 500;
          for (let i = 0; i < phones.length; i += BATCH) {
            await contactApi.syncAndAddContacts(phones.slice(i, i + BATCH));
          }
        } catch { /* silent — contacts list still works without sync */ }
      }
    } catch {
      // Silent — invite section is optional
    }
  }, [profile?.phone]);

  const handleInvite = useCallback(async (contact: PhoneBookContact) => {
    await Share.share({
      message: `Hey ${contact.name}! I'm using z.chat for messaging. Join me! https://zchat.app/download`,
    });
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
      await loadPhoneBookContacts(); // sync first — discovers newly registered users
      await loadContacts();          // then load contacts — includes newly synced ones
      setLoading(false);
      setTimeout(() => searchRef.current?.focus(), 350);
    };
    init();
  }, [loadContacts, loadPhoneBookContacts]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        // Sync first, then reload contacts to pick up newly added ones
        loadPhoneBookContacts().then(() => loadContacts());
      }
    }, [loading, loadContacts, loadPhoneBookContacts]),
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? contacts.filter((c) => {
          const name = getContactDisplayName(c).toLowerCase();
          return name.includes(q) || c.contactUser.phone.includes(q);
        })
      : contacts;
  }, [search, contacts]);

  const sections = useMemo(() => groupContactsByLetter(filtered), [filtered]);

  // Phone contacts NOT on z.chat — candidates for invite
  const inviteContacts = useMemo(() => {
    const contactPhones = new Set(contacts.map((c) => c.contactUser.phone));
    const q = search.toLowerCase().trim();
    const notOnApp = phoneBookContacts.filter(
      (pc) => !pc.normalizedPhones.some((p) => contactPhones.has(p)),
    );
    if (!q) return notOnApp;
    return notOnApp.filter((pc) => pc.name.toLowerCase().includes(q) || pc.phones.some((p) => p.includes(q)));
  }, [phoneBookContacts, contacts, search]);

  return {
    contacts,
    sections,
    inviteContacts,
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
    handleInvite,
  };
}
