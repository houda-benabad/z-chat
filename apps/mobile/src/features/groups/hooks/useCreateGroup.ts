import { useState, useEffect, useCallback, useMemo } from 'react';
import { alert } from '@/shared/utils/alert';
import { useRouter } from 'expo-router';
import { contactApi, groupApi, uploadMedia } from '@/shared/services/api';
import { generateGroupKey, generateGroupKeyBundle } from '@/shared/services/crypto';
import { useImageCropper } from '@/shared/hooks';
import type { UseImageCropperReturn } from '@/shared/hooks/useImageCropper';
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
  cropper: UseImageCropperReturn;
}

export function useCreateGroup(): UseCreateGroupReturn {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select-members');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = c.nickname ?? c.contactUser.name ?? '';
      const phone = c.contactUser.phone;
      return name.toLowerCase().includes(q) || phone.includes(q);
    });
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

  const cropper = useImageCropper(
    useCallback((croppedUri: string) => {
      setGroupAvatar(croppedUri);
    }, []),
  );

  const handlePickAvatar = cropper.pickAndCrop;

  const handleNext = useCallback(() => {
    if (selectedIds.size === 0) {
      alert('Select Members', 'Please select at least one contact');
      return;
    }
    setStep('group-details');
  }, [selectedIds]);

  const handleCreate = useCallback(async () => {
    const name = groupName.trim();
    if (!name) {
      alert('Group Name', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      // Upload local avatar URI if one was cropped
      let avatarUrl: string | undefined;
      if (groupAvatar) {
        setUploadingAvatar(true);
        try {
          avatarUrl = await uploadMedia(groupAvatar, 'image/jpeg');
        } catch {
          alert('Upload failed', 'Could not upload group picture. Please try again.');
          setUploadingAvatar(false);
          setCreating(false);
          return;
        }
        setUploadingAvatar(false);
      }

      const { chat } = await groupApi.createGroup({
        name,
        description: groupDescription.trim() || undefined,
        avatar: avatarUrl,
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
        alert(
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
          recipientAvatar: avatarUrl ?? '',
        },
      });
    } catch {
      alert('Error', 'Failed to create group. Please try again.');
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
    cropper,
  };
}
