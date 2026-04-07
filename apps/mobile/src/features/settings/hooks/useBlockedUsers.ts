import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { settingsApi } from '@/shared/services/api';
import type { BlockedUserItem } from '@/types';

const PAGE_SIZE = 20;

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadBlocked = useCallback(async () => {
    try {
      const { blocked: data, hasMore: more } = await settingsApi.getBlocked(0, PAGE_SIZE);
      setBlocked(data);
      setHasMore(more);
    } catch {
      // Handle
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { blocked: data, hasMore: more } = await settingsApi.getBlocked(blocked.length, PAGE_SIZE);
      setBlocked((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        return [...prev, ...data.filter((b) => !existingIds.has(b.id))];
      });
      setHasMore(more);
    } catch {
      // Handle
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, blocked.length]);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const handleUnblock = useCallback((item: BlockedUserItem) => {
    const name = item.blockedUser.name ?? item.blockedUser.phone;
    Alert.alert(
      'Unblock Contact',
      `Unblock ${name}? They will be able to message and call you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await settingsApi.unblockUser(item.blockedUserId);
              setBlocked((prev) => prev.filter((b) => b.id !== item.id));
            } catch {
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ],
    );
  }, []);

  return {
    blocked,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    handleUnblock,
  };
}
