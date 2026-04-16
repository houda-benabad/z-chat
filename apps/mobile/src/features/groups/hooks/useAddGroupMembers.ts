import { useState, useEffect, useCallback, useMemo } from 'react';
import { alert } from '@/shared/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contactApi, groupApi } from '@/shared/services/api';
import { decryptGroupKey, generateGroupKeyBundle } from '@/shared/services/crypto';
import type { ContactItem, GroupInfo } from '@/types';

export interface UseAddGroupMembersReturn {
  contacts: ContactItem[];
  filtered: ContactItem[];
  loading: boolean;
  adding: boolean;
  search: string;
  setSearch: (s: string) => void;
  selectedIds: Set<string>;
  existingMemberIds: Set<string>;
  toggleMember: (contactUserId: string) => void;
  handleAdd: () => Promise<void>;
}

export function useAddGroupMembers(): UseAddGroupMembersReturn {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [contactsRes, groupRes] = await Promise.all([
          contactApi.getContacts(),
          chatId ? groupApi.getGroupInfo(chatId) : null,
        ]);
        setContacts(contactsRes.contacts);
        if (groupRes) {
          setGroupInfo(groupRes.group);
          setExistingMemberIds(new Set(groupRes.group.participants.map((p) => p.userId)));
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [chatId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = c.nickname ?? c.contactUser.name ?? '';
      return name.toLowerCase().includes(q) || c.contactUser.phone.includes(q);
    });
  }, [search, contacts]);

  const toggleMember = useCallback((contactUserId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactUserId)) next.delete(contactUserId);
      else next.add(contactUserId);
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (!chatId || selectedIds.size === 0) return;
    setAdding(true);
    try {
      const { chat } = await groupApi.addMembers(chatId, [...selectedIds]);

      // Distribute the current group key to newly added members
      if (groupInfo?.myEncryptedGroupKey) {
        const currentGroupKey = await decryptGroupKey(groupInfo.myEncryptedGroupKey);
        if (currentGroupKey) {
          const newParticipants = chat.participants
            .filter((p) => selectedIds.has(p.userId) && p.user?.publicKey);
          const recipients = newParticipants.map((p) => ({
            userId: p.userId,
            publicKeyB64: p.user!.publicKey!,
          }));
          if (recipients.length > 0) {
            const keyBundles = generateGroupKeyBundle(currentGroupKey, recipients);
            await groupApi.distributeKeys(
              chatId,
              keyBundles,
              groupInfo.groupKeyVersion ?? 1,
            ).catch(() => {});
          }
        }
      }

      router.back();
    } catch {
      alert('Error', 'Failed to add members');
    } finally {
      setAdding(false);
    }
  }, [chatId, selectedIds, router, groupInfo]);

  return {
    contacts,
    filtered,
    loading,
    adding,
    search,
    setSearch,
    selectedIds,
    existingMemberIds,
    toggleMember,
    handleAdd,
  };
}
