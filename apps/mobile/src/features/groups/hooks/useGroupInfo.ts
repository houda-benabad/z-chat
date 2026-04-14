import { useState, useEffect, useCallback, useRef } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { alert } from '@/shared/utils/alert';
import { groupApi, contactApi, uploadMedia } from '@/shared/services/api';
import { getSocket, connectSocket } from '@/shared/services/socket';
import { useCurrentUser, useImageCropper } from '@/shared/hooks';
import type { UseImageCropperReturn } from '@/shared/hooks/useImageCropper';
import type { GroupInfo } from '@/types';

export interface UseGroupInfoReturn {
  group: GroupInfo | null;
  loading: boolean;
  myUserId: string;
  isAdmin: boolean;
  actionLoading: boolean;
  contactMap: Record<string, string>;
  editingName: boolean;
  nameInput: string;
  setNameInput: (s: string) => void;
  savingName: boolean;
  uploadingAvatar: boolean;
  handleStartEditName: () => void;
  handleSaveName: () => Promise<void>;
  handleCancelEditName: () => void;
  handleAvatarEdit: () => void;
  cropper: UseImageCropperReturn;
  handleRemoveMember: (userId: string, userName: string) => void;
  handleToggleAdmin: (userId: string, currentRole: string) => Promise<void>;
  handleLeaveGroup: () => void;
  handleAddMembers: () => void;
}

export function useGroupInfo(): UseGroupInfoReturn {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const { userId: myUserId } = useCurrentUser();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const groupRef = useRef<GroupInfo | null>(null);

  const loadGroup = useCallback(async () => {
    if (!chatId) return;
    try {
      const { group: data } = await groupApi.getGroupInfo(chatId);
      setGroup(data);
      groupRef.current = data;
    } catch {
      alert('Error', 'Failed to load group info');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const loadContacts = useCallback(async () => {
    try {
      const { contacts } = await contactApi.getContacts();
      const map: Record<string, string> = {};
      for (const c of contacts) {
        map[c.contactUserId] = c.nickname ?? c.contactUser.name ?? c.contactUser.phone;
      }
      setContactMap(map);
    } catch {}
  }, []);

  useEffect(() => {
    loadGroup();
    loadContacts();
  }, [loadGroup, loadContacts]);

  // Re-load when server emits group membership or role changes
  useEffect(() => {
    if (!chatId) return;

    let off: (() => void) | undefined;

    const attach = (sock: ReturnType<typeof getSocket>) => {
      if (!sock) return;

      const handler = (d: { chatId: string }) => {
        if (d.chatId === chatId) loadGroup();
      };

      sock.on('group:member:added', handler);
      sock.on('group:member:removed', handler);
      sock.on('group:member:role:updated', handler);

      off = () => {
        sock.off('group:member:added', handler);
        sock.off('group:member:removed', handler);
        sock.off('group:member:role:updated', handler);
      };
    };

    const existing = getSocket();
    if (existing) {
      attach(existing);
    } else {
      connectSocket().then(attach).catch(() => {});
    }

    return () => { off?.(); };
  }, [chatId, loadGroup]);

  const isAdmin =
    group?.participants.some((p) => p.userId === myUserId && p.role === 'admin') ?? false;

  const handleStartEditName = useCallback(() => {
    if (!group) return;
    setNameInput(group.name);
    setEditingName(true);
  }, [group]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !chatId) return;
    setSavingName(true);
    try {
      await groupApi.updateGroup(chatId, { name: trimmed });
      setGroup((prev) => prev ? { ...prev, name: trimmed } : null);
      if (groupRef.current) groupRef.current = { ...groupRef.current, name: trimmed };
      setEditingName(false);
    } catch {
      alert('Error', 'Failed to update group name');
    } finally {
      setSavingName(false);
    }
  }, [chatId, nameInput]);

  const handleCancelEditName = useCallback(() => {
    setEditingName(false);
  }, []);

  const cropper = useImageCropper(
    useCallback(async (croppedUri: string) => {
      if (!chatId) return;
      setUploadingAvatar(true);
      try {
        const url = await uploadMedia(croppedUri, 'image/jpeg');
        await groupApi.updateGroup(chatId, { avatar: url });
        setGroup((prev) => prev ? { ...prev, avatar: url } : null);
        if (groupRef.current) groupRef.current = { ...groupRef.current, avatar: url };
      } catch {
        alert('Upload failed', 'Could not upload group picture. Please try again.');
      } finally {
        setUploadingAvatar(false);
      }
    }, [chatId]),
  );

  const handleAvatarEdit = useCallback(() => {
    const options = ['Take Photo', 'Choose Photo', 'Delete Photo', 'Cancel'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    const onSelect = (index: number) => {
      if (index === 0) cropper.takeAndCrop();
      else if (index === 1) cropper.pickAndCrop();
      else if (index === 2) {
        if (!chatId) return;
        setUploadingAvatar(true);
        groupApi.updateGroup(chatId, { avatar: null })
          .then(() => {
            setGroup((prev) => prev ? { ...prev, avatar: null } : null);
            if (groupRef.current) groupRef.current = { ...groupRef.current, avatar: null };
          })
          .catch(() => {
            alert('Error', 'Failed to remove group photo');
          })
          .finally(() => {
            setUploadingAvatar(false);
          });
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        onSelect,
      );
    } else {
      Alert.alert('Group Photo', undefined, [
        { text: 'Take Photo', onPress: () => onSelect(0) },
        { text: 'Choose Photo', onPress: () => onSelect(1) },
        { text: 'Delete Photo', style: 'destructive', onPress: () => onSelect(2) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [chatId, cropper]);

  const handleRemoveMember = useCallback(
    (userId: string, userName: string) => {
      if (!chatId) return;
      alert(
        'Remove Member',
        `Remove ${userName} from the group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              if (actionLoading) return;
              setActionLoading(true);
              try {
                await groupApi.removeMember(chatId, userId);
                // Refresh group info after removal
                const { group: refreshed } = await groupApi.getGroupInfo(chatId);
                setGroup(refreshed);
                groupRef.current = refreshed;
              } catch {
                alert('Error', 'Failed to remove member');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ],
      );
    },
    [chatId],
  );

  const handleToggleAdmin = useCallback(
    async (userId: string, currentRole: string) => {
      if (!chatId || actionLoading) return;
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      setActionLoading(true);
      try {
        await groupApi.updateMemberRole(chatId, userId, newRole);
        loadGroup();
      } catch {
        alert('Error', 'Failed to update role');
      } finally {
        setActionLoading(false);
      }
    },
    [chatId, actionLoading, loadGroup],
  );

  const handleLeaveGroup = useCallback(() => {
    if (!chatId) return;
    alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (actionLoading) return;
            setActionLoading(true);
            try {
              await groupApi.removeMember(chatId, myUserId);
              router.replace('/chat-list');
            } catch {
              alert('Error', 'Failed to leave group');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [chatId, myUserId, actionLoading, router]);

  const handleAddMembers = useCallback(() => {
    router.push({
      pathname: '/add-group-members',
      params: { chatId },
    });
  }, [chatId, router]);

  return {
    group,
    loading,
    myUserId,
    isAdmin,
    actionLoading,
    contactMap,
    editingName,
    nameInput,
    setNameInput,
    savingName,
    uploadingAvatar,
    handleStartEditName,
    handleSaveName,
    handleCancelEditName,
    handleAvatarEdit,
    cropper,
    handleRemoveMember,
    handleToggleAdmin,
    handleLeaveGroup,
    handleAddMembers,
  };
}
