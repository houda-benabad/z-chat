import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { contactApi, chatApi, ApiError } from '@/shared/services/api';

export interface FoundUser {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  isContact: boolean;
}

export interface UseAddContactReturn {
  phone: string;
  setPhone: (p: string) => void;
  contactName: string;
  setContactName: (n: string) => void;
  saving: boolean;
  added: boolean;
  addError: string | null;
  nameError: string | null;
  foundUser: FoundUser | null;
  searched: boolean;
  isValidPhone: boolean;
  messagingLoading: boolean;
  handleSearch: () => Promise<void>;
  handleAddContact: () => Promise<void>;
  handleMessage: () => Promise<void>;
}

export function useAddContact(): UseAddContactReturn {
  const router = useRouter();
  const { prefillPhone, prefillName } = useLocalSearchParams<{
    prefillPhone?: string;
    prefillName?: string;
  }>();

  const [phone, setPhone] = useState(prefillPhone || '+');
  const [contactName, setContactName] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const existingNamesRef = useRef<Set<string>>(new Set());
  const didPrefillSearch = useRef(false);

  const isValidPhone = /^\+[1-9]\d{6,14}$/.test(phone);

  // Load existing contact names for duplicate checking
  useEffect(() => {
    let cancelled = false;
    contactApi.getContacts(0, 500).then(({ contacts }) => {
      if (cancelled) return;
      const names = new Set(
        contacts.map((c) => {
          const display = c.nickname ?? c.contactUser.name ?? c.contactUser.phone;
          return display.trim().toLowerCase();
        })
      );
      existingNamesRef.current = names;
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Clear nameError when contactName changes
  useEffect(() => {
    if (nameError) setNameError(null);
  }, [contactName]);

  const handleSearch = useCallback(async () => {
    if (!isValidPhone) return;
    setSaving(true);
    setSearched(false);
    setFoundUser(null);
    setAddError(null);
    setNameError(null);
    setAdded(false);
    try {
      const { users } = await contactApi.syncContacts([phone]);
      if (users.length > 0) {
        const u = users[0]!;
        setFoundUser({
          id: u.id, phone: u.phone, name: u.name, avatar: u.avatar, isContact: !!u.isContact,
        });
        // Pre-fill contact name with their profile name
        setContactName(u.name ?? '');
      }
      setSearched(true);
    } catch {
      setSearched(true);
      setAddError('Failed to search. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [phone, isValidPhone]);

  // Auto-search when prefillPhone is provided
  useEffect(() => {
    if (prefillPhone && isValidPhone && !didPrefillSearch.current) {
      didPrefillSearch.current = true;
      handleSearch();
    }
  }, [prefillPhone, isValidPhone, handleSearch]);

  const handleAddContact = useCallback(async () => {
    if (!foundUser) return;

    const trimmed = contactName.trim();
    if (!trimmed) {
      setNameError('Contact name is required');
      return;
    }

    if (existingNamesRef.current.has(trimmed.toLowerCase())) {
      setNameError('You already have a contact with this name');
      return;
    }

    setSaving(true);
    try {
      await contactApi.addContact(foundUser.phone, trimmed);
      setAdded(true);
      setTimeout(() => router.back(), 900);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to add contact.';
      setAddError(message);
      setSaving(false);
    }
  }, [foundUser, contactName, router]);

  const handleMessage = useCallback(async () => {
    if (!foundUser) return;
    setMessagingLoading(true);
    try {
      const { chat } = await chatApi.createChat(foundUser.id);
      router.replace({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          recipientId: foundUser.id,
          name: foundUser.name ?? foundUser.phone,
          ...(foundUser.avatar ? { recipientAvatar: foundUser.avatar } : {}),
          backTo: '/chat-list',
        },
      });
    } catch {
      setAddError('Failed to open chat. Please try again.');
    } finally {
      setMessagingLoading(false);
    }
  }, [foundUser, router]);

  return {
    phone,
    setPhone,
    contactName,
    setContactName,
    saving,
    added,
    addError,
    nameError,
    foundUser,
    searched,
    isValidPhone,
    messagingLoading,
    handleSearch,
    handleAddContact,
    handleMessage,
  };
}
