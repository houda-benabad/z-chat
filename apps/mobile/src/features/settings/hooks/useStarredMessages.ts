import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '@/shared/services/api';
import { decryptGroupKey } from '@/shared/services/crypto';
import { decryptChatMessage } from '@/features/chat/utils/decryptChatMessage';
import type { StarredMessageItem } from '@/types';

const PAGE_SIZE = 20;

async function decryptStarredBatch(items: StarredMessageItem[]): Promise<StarredMessageItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const isGroup = item.message.chat.type === 'group';
      let groupKey: string | null = null;

      if (isGroup && item.encryptedGroupKey) {
        groupKey = await decryptGroupKey(item.encryptedGroupKey);
      }

      const decryptedMsg = await decryptChatMessage(item.message, {
        isGroup,
        recipientPublicKey: item.recipientPublicKey,
        groupKey,
      });

      return { ...item, message: { ...decryptedMsg, chat: item.message.chat } };
    }),
  );
}

export function useStarredMessages() {
  const [starred, setStarred] = useState<StarredMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadStarred = useCallback(async () => {
    try {
      const data = await chatApi.getStarredMessages(undefined, PAGE_SIZE);
      const decrypted = await decryptStarredBatch(data.starredMessages);
      setStarred(decrypted);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      // Handle
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.getStarredMessages(nextCursor, PAGE_SIZE);
      const decrypted = await decryptStarredBatch(data.starredMessages);
      setStarred((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        return [...prev, ...decrypted.filter((s) => !existingIds.has(s.id))];
      });
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      // Handle
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  useEffect(() => {
    loadStarred();
  }, [loadStarred]);

  const handleUnstar = useCallback(async (item: StarredMessageItem) => {
    let previous: StarredMessageItem[] = [];
    setStarred((prev) => {
      previous = prev;
      return prev.filter((i) => i.id !== item.id);
    });
    try {
      await chatApi.unstarMessage(item.message.chatId, item.messageId);
    } catch {
      setStarred(previous);
    }
  }, []);

  return {
    starred,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    handleUnstar,
  };
}
