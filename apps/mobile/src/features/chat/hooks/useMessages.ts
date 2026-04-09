import { useState, useCallback, useRef, useEffect } from 'react';
import { chatApi, userApi } from '@/shared/services/api';
import { ApiError } from '@/shared/services/api/client';
import { decryptGroupKey } from '@/shared/services/crypto';
import { decryptChatMessage } from '../utils/decryptChatMessage';
import type { ChatMessage } from '@/types';

export type ParticipantData = {
  userId: string;
  lastReadMessageId: string | null;
  encryptedGroupKey?: string | null;
  groupKeyVersion?: number;
  user: { isOnline: boolean; publicKey?: string | null; phone: string; name: string | null };
};

interface UseMessagesParams {
  chatId: string;
  isGroup: boolean;
  recipientId: string;
}

export interface UseMessagesReturn {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  loadError: boolean;
  groupKey: string | null;
  recipientPublicKey: string | null;
  /** Append a single message, deduplicating by id. */
  addMessage: (msg: ChatMessage) => void;
  /** Replace a pending bubble with the confirmed server message. */
  confirmMessage: (pendingId: string, confirmed: ChatMessage, plaintext: string) => void;
  /** Mark a pending bubble as failed. */
  markMessageFailed: (pendingId: string) => void;
  /** Remove a message by id (used to clear failed bubbles on retry). */
  removeMessage: (id: string) => void;
  /** Patch an existing message by id with partial updates. */
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  loadMessages: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  participants: ParticipantData[];
  isForbidden: boolean;
  starredMessageIds: Set<string>;
  toggleStar: (messageId: string) => Promise<void>;
}

export function useMessages({
  chatId,
  isGroup,
  recipientId,
}: UseMessagesParams): UseMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(!!chatId);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
  const disappearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear all timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      disappearTimers.current.forEach(clearTimeout);
      disappearTimers.current.clear();
    };
  }, []);

  const scheduleDisappear = useCallback((msg: ChatMessage) => {
    if (!msg.disappearsAt) return;
    const msLeft = new Date(msg.disappearsAt).getTime() - Date.now();
    if (msLeft <= 0) return;
    const t = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      disappearTimers.current.delete(msg.id);
    }, msLeft);
    disappearTimers.current.set(msg.id, t);
  }, []);

  // For new chats (no chatId yet), pre-fetch the recipient's public key so
  // E2E encryption is ready before the first message is sent.
  useEffect(() => {
    if (chatId || isGroup || !recipientId) return;
    userApi.getUser(recipientId)
      .then(({ user }) => setRecipientPublicKey(user.publicKey ?? null))
      .catch(() => {});
  }, [chatId, isGroup, recipientId]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    scheduleDisappear(msg);
  }, [scheduleDisappear]);

  /** Replace a pending (client-only) bubble with the confirmed server message. */
  const confirmMessage = useCallback((pendingId: string, confirmed: ChatMessage, plaintext: string) => {
    setMessages((prev) =>
      prev.some((m) => m.id === confirmed.id)
        ? prev.filter((m) => m.id !== pendingId)               // already added via socket event
        : prev.map((m) => m.id === pendingId
            ? { ...confirmed, content: plaintext, pending: false }
            : m
          ),
    );
    scheduleDisappear(confirmed);
  }, [scheduleDisappear]);

  const markMessageFailed = useCallback((pendingId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === pendingId ? { ...m, failed: true, pending: false } : m)
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const decryptBatch = useCallback(
    (msgs: ChatMessage[], opts: { isGroup: boolean; recipientPublicKey: string | null; groupKey: string | null }) =>
      Promise.all(msgs.map((m) => decryptChatMessage(m, opts))),
    [],
  );

  const toggleStar = useCallback(async (messageId: string) => {
    if (!chatId) return;
    const wasStarred = starredMessageIds.has(messageId);
    setStarredMessageIds((prev) => {
      const next = new Set(prev);
      if (wasStarred) next.delete(messageId); else next.add(messageId);
      return next;
    });
    try {
      if (wasStarred) {
        await chatApi.unstarMessage(chatId, messageId);
      } else {
        await chatApi.starMessage(chatId, messageId);
      }
    } catch {
      setStarredMessageIds((prev) => {
        const next = new Set(prev);
        if (wasStarred) next.add(messageId); else next.delete(messageId);
        return next;
      });
    }
  }, [chatId, starredMessageIds]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    setLoadError(false);
    try {
      const [data, starredResult] = await Promise.all([
        chatApi.getMessages(chatId),
        chatApi.getStarredMessageIdsForChat(chatId).catch(() => ({ starredMessageIds: [] as string[] })),
      ]);
      setStarredMessageIds(new Set(starredResult.starredMessageIds));
      let msgs = data.messages.reverse();

      if (!isGroup) {
        const other = data.participants?.find((p) => p.userId === recipientId);
        const pubKey = other?.user.publicKey ?? null;
        setRecipientPublicKey(pubKey);
        msgs = await decryptBatch(msgs, { isGroup: false, recipientPublicKey: pubKey, groupKey: null });
      } else {
        const myEntry = data.participants?.find((p) => p.encryptedGroupKey != null);
        if (myEntry?.encryptedGroupKey) {
          const gKey = await decryptGroupKey(myEntry.encryptedGroupKey);
          if (gKey) {
            setGroupKey(gKey);
            msgs = await decryptBatch(msgs, { isGroup: true, recipientPublicKey: null, groupKey: gKey });
          }
        }
      }

      setMessages(msgs);
      setNextCursor(data.nextCursor);
      setParticipants(data.participants ?? []);
      msgs.forEach(scheduleDisappear);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setIsForbidden(true);
      } else {
        setLoadError(true);
      }
    }
    finally { setLoading(false); }
  }, [chatId, isGroup, recipientId, decryptBatch]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi.getMessages(chatId, nextCursor);
      const older = await decryptBatch(data.messages.reverse(), {
        isGroup,
        recipientPublicKey,
        groupKey,
      });
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(data.nextCursor);
    } catch { /* user can retry */ }
    finally { setLoadingMore(false); }
  }, [chatId, nextCursor, loadingMore, isGroup, recipientPublicKey, groupKey, decryptBatch]);

  return {
    messages,
    loading,
    loadingMore,
    loadError,
    groupKey,
    recipientPublicKey,
    addMessage,
    confirmMessage,
    markMessageFailed,
    removeMessage,
    updateMessage,
    loadMessages,
    loadOlderMessages,
    participants,
    isForbidden,
    starredMessageIds,
    toggleStar,
  };
}
