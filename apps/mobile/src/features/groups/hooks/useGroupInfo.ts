import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { alert } from '@/shared/utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { groupApi, contactApi, uploadMedia } from '@/shared/services/api';
import { getSocket, connectSocket } from '@/shared/services/socket';
import { generateGroupKey, generateGroupKeyBundle } from '@/shared/services/crypto';
import { useCurrentUser } from '@/shared/hooks';
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
  handlePickAvatar: () => Promise<void>;
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
  const myUserIdRef = useRef('');
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

  // Keep the ref in sync for socket handlers that close over it
  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

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

      const rotationHandler = (d: { chatId: string }) => {
        if (d.chatId !== chatId) return;
        const currentGroup = groupRef.current;
        const uid = myUserIdRef.current;
        const isCurrentAdmin = currentGroup?.participants.some(
          (p) => p.userId === uid && p.role === 'admin',
        ) ?? false;
        if (!isCurrentAdmin) return;
        // Admin: rotate group key when a member is removed
        groupApi.getGroupInfo(chatId).then(({ group: refreshed }) => {
          setGroup(refreshed);
          groupRef.current = refreshed;
          const remaining = refreshed.participants.filter((p) => p.user?.publicKey);
          if (remaining.length > 0) {
            const newGroupKey = generateGroupKey();
            const newVersion = (refreshed.groupKeyVersion ?? 0) + 1;
            const keyBundles = generateGroupKeyBundle(
              newGroupKey,
              remaining.map((p) => ({ userId: p.userId, publicKeyB64: p.user!.publicKey! })),
            );
            groupApi.distributeKeys(chatId, keyBundles, newVersion).catch(() => {});
          }
        }).catch(() => {});
      };

      sock.on('group:member:added', handler);
      sock.on('group:member:removed', handler);
      sock.on('group:member:role:updated', handler);
      sock.on('group:key_rotation_needed', rotationHandler);

      off = () => {
        sock.off('group:member:added', handler);
        sock.off('group:member:removed', handler);
        sock.off('group:member:role:updated', handler);
        sock.off('group:key_rotation_needed', rotationHandler);
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

  const handlePickAvatar = useCallback(async () => {
    if (!chatId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission denied', 'Allow photo access to set a group picture');
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
      await groupApi.updateGroup(chatId, { avatar: url });
      setGroup((prev) => prev ? { ...prev, avatar: url } : null);
      if (groupRef.current) groupRef.current = { ...groupRef.current, avatar: url };
    } catch {
      alert('Upload failed', 'Could not upload group picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [chatId]);

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

                // Admin: rotate group key so removed member can't decrypt future messages
                if (isAdmin) {
                  const remaining = refreshed.participants.filter((p) => p.user?.publicKey);
                  if (remaining.length > 0) {
                    const newGroupKey = generateGroupKey();
                    const newVersion = (refreshed.groupKeyVersion ?? 0) + 1;
                    const keyBundles = generateGroupKeyBundle(
                      newGroupKey,
                      remaining.map((p) => ({ userId: p.userId, publicKeyB64: p.user!.publicKey! })),
                    );
                    await groupApi.distributeKeys(chatId, keyBundles, newVersion).catch(() => {});
                  }
                }
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
    [chatId, isAdmin],
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
    handlePickAvatar,
    handleRemoveMember,
    handleToggleAdmin,
    handleLeaveGroup,
    handleAddMembers,
  };
}
