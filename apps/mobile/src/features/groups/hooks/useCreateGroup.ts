import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { contactApi, groupApi, uploadMedia } from '@/shared/services/api';
import { generateGroupKey, generateGroupKeyBundle } from '@/shared/services/crypto';
import type { ContactItem } from '@/types';

type Step = 'select-members' | 'group-details';

export interface UseCreateGroupReturn {
  contacts: ContactItem[];
  filtered: ContactItem[];
  loading: boolean;
  creating: boolean;
  uploadingAvatar: boolean;
  search: string;
  setSearch: (s: string) => void;
  step: Step;
  setStep: (s: Step) => void;
  selectedIds: Set<string>;
  toggleMember: (id: string) => void;
  groupName: string;
  setGroupName: (n: string) => void;
  groupDescription: string;
  setGroupDescription: (d: string) => void;
  groupAvatar: string | null;
  handlePickAvatar: () => Promise<void>;
  handleNext: () => void;
  handleCreate: () => Promise<void>;
}

export function useCreateGroup(): UseCreateGroupReturn {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select-members');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [filtered, setFiltered] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const { contacts: data } = await contactApi.getContacts();
      setContacts(data);
      setFiltered(data);
    } catch {
      // Will retry
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadContacts();
      setLoading(false);
    };
    init();
  }, [loadContacts]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      contacts.filter((c) => {
        const name = c.nickname ?? c.contactUser.name ?? '';
        const phone = c.contactUser.phone;
        return name.toLowerCase().includes(q) || phone.includes(q);
      }),
    );
  }, [search, contacts]);

  const toggleMember = useCallback((contactUserId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactUserId)) {
        next.delete(contactUserId);
      } else {
        next.add(contactUserId);
      }
      return next;
    });
  }, []);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow photo access to set a group picture');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setUploadingAvatar(true);
    try {
      const url = await uploadMedia(uri, 'image/jpeg');
      setGroupAvatar(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload group picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (selectedIds.size === 0) {
      Alert.alert('Select Members', 'Please select at least one contact');
      return;
    }
    setStep('group-details');
  }, [selectedIds]);

  const handleCreate = useCallback(async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert('Group Name', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const { chat } = await groupApi.createGroup({
        name,
        description: groupDescription.trim() || undefined,
        avatar: groupAvatar ?? undefined,
        memberIds: [...selectedIds],
      });

      // Generate group key and distribute to all participants who have a public key
      const recipients = chat.participants
        .filter((p) => p.user?.publicKey)
        .map((p) => ({ userId: p.userId, publicKeyB64: p.user!.publicKey! }));

      let keyDistributionFailed = false;
      if (recipients.length > 0) {
        const groupKey = generateGroupKey();
        const keyBundles = generateGroupKeyBundle(groupKey, recipients);
        try {
          await groupApi.distributeKeys(chat.id, keyBundles, 1);
        } catch {
          keyDistributionFailed = true;
        }
      }

      if (keyDistributionFailed) {
        Alert.alert(
          'Group created with a warning',
          'The group was created but encryption keys could not be distributed to all members. Some members may not be able to read messages until they rejoin.',
          [{ text: 'OK' }],
        );
      }

      router.replace({
        pathname: '/chat',
        params: {
          chatId: chat.id,
          name,
          chatType: 'group',
          recipientAvatar: groupAvatar ?? '',
        },
      });
    } catch {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [groupName, groupDescription, selectedIds, router, groupAvatar]);

  return {
    contacts,
    filtered,
    loading,
    creating,
    uploadingAvatar,
    search,
    setSearch,
    step,
    setStep,
    selectedIds,
    toggleMember,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,
    groupAvatar,
    handlePickAvatar,
    handleNext,
    handleCreate,
  };
}
