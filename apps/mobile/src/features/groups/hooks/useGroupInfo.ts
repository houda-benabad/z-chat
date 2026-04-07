import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { groupApi } from '@/shared/services/api';
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
  const myUserIdRef = useRef('');
  const groupRef = useRef<GroupInfo | null>(null);

  const loadGroup = useCallback(async () => {
    if (!chatId) return;
    try {
      const { group: data } = await groupApi.getGroupInfo(chatId);
      setGroup(data);
      groupRef.current = data;
    } catch {
      Alert.alert('Error', 'Failed to load group info');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Keep the ref in sync for socket handlers that close over it
  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

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

  const handleRemoveMember = useCallback(
    (userId: string, userName: string) => {
      if (!chatId) return;
      Alert.alert(
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
                Alert.alert('Error', 'Failed to remove member');
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
        Alert.alert('Error', 'Failed to update role');
      } finally {
        setActionLoading(false);
      }
    },
    [chatId, actionLoading, loadGroup],
  );

  const handleLeaveGroup = useCallback(() => {
    if (!chatId) return;
    Alert.alert(
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
              Alert.alert('Error', 'Failed to leave group');
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
    handleRemoveMember,
    handleToggleAdmin,
    handleLeaveGroup,
    handleAddMembers,
  };
}
