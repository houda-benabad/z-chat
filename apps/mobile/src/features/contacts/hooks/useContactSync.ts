import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { contactApi } from '@/shared/services/api';
import { normalizePhoneNumber, extractCountryCode } from '@/shared/utils';
import type { SyncedUser, PhoneBookContact } from '@/types';

const BATCH_SIZE = 500;

export interface ContactSyncResult {
  matchedUsers: SyncedUser[];
  totalPhoneContacts: number;
  addedCount: number;
  phoneBookContacts: PhoneBookContact[];
}

export function useContactSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const readPhoneBook = useCallback(async (defaultCC: string): Promise<{
    phoneBookContacts: PhoneBookContact[];
    allPhones: string[];
  }> => {
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.Image],
    });

    const phoneBookContacts: PhoneBookContact[] = [];
    const allNormalized = new Set<string>();

    for (const contact of data) {
      if (!contact.phoneNumbers?.length) continue;

      const raw = contact.phoneNumbers
        .map((p) => p.number ?? '')
        .filter(Boolean);
      const normalized = raw
        .map((r) => normalizePhoneNumber(r, defaultCC))
        .filter((n): n is string => n !== null);

      if (normalized.length === 0) continue;

      phoneBookContacts.push({
        id: contact.id ?? '',
        name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
        phones: raw,
        normalizedPhones: normalized,
        imageUri: contact.image?.uri,
      });

      for (const n of normalized) allNormalized.add(n);
    }

    return { phoneBookContacts, allPhones: Array.from(allNormalized) };
  }, []);

  const syncContacts = useCallback(async (userPhone: string): Promise<ContactSyncResult | null> => {
    setSyncing(true);
    setError(null);

    try {
      const defaultCC = extractCountryCode(userPhone);
      const { phoneBookContacts, allPhones } = await readPhoneBook(defaultCC);

      // Remove user's own phone
      const filtered = allPhones.filter((p) => p !== userPhone);

      if (filtered.length === 0) {
        return { matchedUsers: [], totalPhoneContacts: phoneBookContacts.length, addedCount: 0, phoneBookContacts };
      }

      const phoneToName = new Map<string, string>();
      for (const c of phoneBookContacts) {
        if (!c.name || c.name === 'Unknown') continue;
        for (const p of c.normalizedPhones) {
          if (!phoneToName.has(p)) phoneToName.set(p, c.name);
        }
      }

      // Batch into chunks
      const allMatched: SyncedUser[] = [];
      let totalAdded = 0;

      for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
        const batch = filtered.slice(i, i + BATCH_SIZE);
        const payload = batch.map((phone) => {
          const name = phoneToName.get(phone);
          return name ? { phone, name } : { phone };
        });
        const { users, addedCount } = await contactApi.syncAndAddContacts(payload);
        allMatched.push(...users);
        totalAdded += addedCount;
      }

      return {
        matchedUsers: allMatched,
        totalPhoneContacts: phoneBookContacts.length,
        addedCount: totalAdded,
        phoneBookContacts,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync contacts');
      return null;
    } finally {
      setSyncing(false);
    }
  }, [readPhoneBook]);

  return { syncContacts, readPhoneBook, requestPermission, checkPermission, syncing, error };
}
