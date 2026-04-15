import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { chatApi, userApi, contactApi } from '@/shared/services/api';
import { connectSocket } from '@/shared/services/socket';
import { showMessageNotification, getExpoPushToken } from '@/shared/services/notifications';
import { decryptMessage, decryptGroupMessage, decryptGroupKey, isEncrypted } from '@/shared/services/crypto';
import { decryptChatMessage } from '../utils/decryptChatMessage';
import { resolveSystemText } from '../utils/resolveSystemText';
import { useAppSettings } from '@/shared/context/AppSettingsContext';
import type { ChatListItem, ChatMessage, ContactItem } from '@/types';

export type ChatFilter = 'all' | 'unread' | 'groups';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

async function decryptLastMessage(chat: ChatListItem, myUserId: string): Promise<ChatListItem> {
  if (!chat.lastMessage || !isEncrypted(chat.lastMessage.content)) return chat;

  if (chat.type !== 'group') {
    const publicKey = chat.participants.find((p) => p.userId !== myUserId)?.user?.publicKey ?? null;
    if (!publicKey) return { ...chat, lastMessage: { ...chat.lastMessage, content: '🔒 Encrypted message' } };
    const msg = await decryptChatMessage(chat.lastMessage, {
      isGroup: false, recipientPublicKey: publicKey, groupKey: null,
    });
    return { ...chat, lastMessage: msg };
  }

  const encKey = chat.participants.find((p) => p.userId === myUserId)?.encryptedGroupKey ?? null;
  if (!encKey) return chat;
  const groupKey = await decryptGroupKey(encKey);
  if (!groupKey) return chat;
  const msg = await decryptChatMessage(chat.lastMessage, {
    isGroup: true, recipientPublicKey: null, groupKey,
  });
  return { ...chat, lastMessage: msg };
}

export interface UseChatListReturn {
  chats: ChatListItem[];
  filteredChats: ChatListItem[];
  chatFilter: ChatFilter;
  setChatFilter: (f: ChatFilter) => void;
  contacts: ContactItem[];
  nicknames: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  pendingDelete: { chatId: string; undo: () => void } | null;
  loadChats: () => Promise<void>;
  loadNicknames: () => Promise<void>;
  loadMore: () => Promise<void>;
  onRefresh: () => Promise<void>;
  deleteConversation: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
}

export function useChatList(myUserId: string): UseChatListReturn {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ chatId: string; undo: () => void } | null>(null);
  const [nicknames, setNicknames] = useState<Map<string, string | null>>(new Map());
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextCursorRef = useRef<string | null>(null);

  const { settings } = useAppSettings();

  // Internal ref mirrors state so socket handlers always see the latest list
  // without causing stale-closure issues.
  const chatsRef               = useRef<ChatListItem[]>([]);
  const deletingIds            = useRef<Set<string>>(new Set());
  const myUserIdRef            = useRef(myUserId);
  myUserIdRef.current          = myUserId;
  const nicknamesRef           = useRef<Map<string, string | null>>(new Map());
  nicknamesRef.current         = nicknames;
  const notificationPreviewRef = useRef(settings?.notificationPreview ?? true);
  notificationPreviewRef.current = settings?.notificationPreview ?? true;
  const msgNotifsRef   = useRef(settings?.messageNotifications ?? true);
  msgNotifsRef.current = settings?.messageNotifications ?? true;
  const groupNotifsRef   = useRef(settings?.groupNotifications ?? true);
  groupNotifsRef.current = settings?.groupNotifications ?? true;

  const setAndMirror = useCallback((updated: ChatListItem[]) => {
    chatsRef.current = updated;
    setChats(updated);
  }, []);

  const filteredChats = useMemo(() => {
    if (chatFilter === 'unread') return chats.filter((c) => c.unreadCount > 0);
    if (chatFilter === 'groups') return chats.filter((c) => c.type === 'group');
    return chats;
  }, [chats, chatFilter]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadChats = useCallback(async () => {
    try {
      const { chats: data, hasMore: more, nextCursor } = await chatApi.getChats();
      nextCursorRef.current = nextCursor;
      setHasMore(more);
      const filtered = data.filter((c) => !deletingIds.current.has(c.id));
      const decrypted = await Promise.all(filtered.map((c) => decryptLastMessage(c, myUserIdRef.current)));
      setAndMirror(decrypted);
    } catch { /* user can pull-to-refresh */ }
  }, [setAndMirror]);

  const loadMore = useCallback(async () => {
    if (!nextCursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const { chats: data, hasMore: more, nextCursor } = await chatApi.getChats(nextCursorRef.current);
      nextCursorRef.current = nextCursor;
      setHasMore(more);
      const newItems = data.filter(
        (c) => !deletingIds.current.has(c.id) && !chatsRef.current.some((existing) => existing.id === c.id),
      );
      const decrypted = await Promise.all(newItems.map((c) => decryptLastMessage(c, myUserIdRef.current)));
      setAndMirror([...chatsRef.current, ...decrypted]);
    } catch { /* silently ignore */ }
    finally {
      setLoadingMore(false);
    }
  }, [loadingMore, setAndMirror]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const deleteConversation = useCallback((chatId: string) => {
    // Guard against loadChats() refetching this chat during the undo window
    deletingIds.current.add(chatId);

    // Save only the deleted chat for undo (preserves socket updates to other chats)
    const deletedChat = chatsRef.current.find((c) => c.id === chatId);

    // Remove from UI immediately
    LayoutAnimation.configureNext({
      duration: 250,
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setAndMirror(chatsRef.current.filter((c) => c.id !== chatId));

    const undo = () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      deletingIds.current.delete(chatId);
      setPendingDelete(null);
      if (deletedChat && !chatsRef.current.some((c) => c.id === chatId)) {
        const restored = [...chatsRef.current, deletedChat].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setAndMirror(restored);
      }
    };

    setPendingDelete({ chatId, undo });

    // After 4 s, commit the delete to the server
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(async () => {
      setPendingDelete(null);
      try {
        await chatApi.deleteConversation(chatId);
      } catch {
        loadChats(); // revert on API failure
      } finally {
        deletingIds.current.delete(chatId);
      }
    }, 4000);
  }, [loadChats, setAndMirror]);

  const markAsRead = useCallback((chatId: string) => {
    setAndMirror(
      chatsRef.current.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [setAndMirror]);

  // ─── Nickname map (contact nicknames keyed by userId) ──────────────────────
  const loadNicknames = useCallback(async () => {
    try {
      const { contacts: fetched } = await contactApi.getContacts(0, 1000);
      const map = new Map<string, string | null>();
      for (const c of fetched) {
        map.set(c.contactUserId, c.nickname ?? null);
      }
      setNicknames(map);
      setContacts(fetched);
    } catch {}
  }, []);

  useEffect(() => { loadNicknames(); }, [loadNicknames]);

  // ─── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let off: (() => void) | undefined;

    // Register push token once on mount (best-effort, never blocks UI)
    getExpoPushToken().then((token) => {
      if (token) userApi.savePushToken(token).catch(() => {});
    }).catch(() => {});

    connectSocket().then((sock) => {
      setLoading(false);

      const handleMessageNew = async (message: ChatMessage) => {
        const isFromMe = message.senderId === myUserIdRef.current;

        if (!isFromMe) {
          const chat = chatsRef.current.find((c) => c.id === message.chatId);
          const isGroupChat = chat?.type === 'group';
          const otherUser = isGroupChat ? null : chat?.participants.find((p) => p.userId !== myUserIdRef.current)?.user;

          const inContacts = nicknamesRef.current.has(message.senderId);
          const nickname   = nicknamesRef.current.get(message.senderId) ?? null;
          let senderName: string;
          if (isGroupChat) {
            const display = nickname ?? message.sender?.name ?? 'Unknown';
            senderName = chat?.name ? `${chat.name}: ${display}` : display;
          } else {
            senderName = nickname
              ?? (inContacts ? (otherUser?.name ?? otherUser?.phone) : otherUser?.phone)
              ?? (inContacts ? (message.sender as { name?: string | null })?.name : (message.sender as { phone?: string | null })?.phone)
              ?? 'New message';
          }

          let body: string;
          if (message.type === 'system') {
            body = resolveSystemText(
              message.content,
              myUserIdRef.current,
              (id) => nicknamesRef.current.get(id) ?? null,
            );
          } else if (message.type !== 'text') {
            body = ({ image: 'Photo', video: 'Video', audio: 'Audio', document: 'Document', voice_note: 'Voice note' }[message.type] ?? message.type);
          } else if (notificationPreviewRef.current && isEncrypted(message.content) && message.content) {
            // Preview ON — attempt to decrypt the message content
            let plain: string | null = null;
            try {
              if (!isGroupChat) {
                const publicKey = otherUser?.publicKey ?? (message.sender as { publicKey?: string | null })?.publicKey;
                if (publicKey) plain = await decryptMessage(message.content, publicKey);
              } else if (isGroupChat) {
                const myParticipant = chat?.participants.find((p) => p.userId === myUserIdRef.current);
                const encKey = myParticipant?.encryptedGroupKey ?? null;
                if (encKey) {
                  const groupKey = await decryptGroupKey(encKey);
                  if (groupKey) plain = decryptGroupMessage(message.content, groupKey);
                }
              }
            } catch { /* decryption failed — use fallback */ }
            body = plain ?? (isEncrypted(message.content) ? 'New message' : (message.content ?? 'New message'));
          } else {
            body = isEncrypted(message.content) ? 'New message' : (message.content ?? 'New message');
          }

          const notifEnabled = isGroupChat ? groupNotifsRef.current : msgNotifsRef.current;
          if (notifEnabled) {
            showMessageNotification(senderName, body, message.chatId, {
              chatType: chat?.type ?? undefined,
              recipientId: otherUser?.id ?? undefined,
              name: isGroupChat ? (chat?.name ?? 'Group') : (otherUser?.name ?? otherUser?.phone ?? undefined),
              recipientAvatar: (isGroupChat ? chat?.avatar : otherUser?.avatar) ?? undefined,
            });
          }
        }

        // Unknown chat — re-fetch so the new conversation appears
        if (!chatsRef.current.some((c) => c.id === message.chatId)) {
          loadChats();
          return;
        }

        // Decrypt only the affected chat; all others return immediately
        const updatedChats = await Promise.all(
          chatsRef.current.map(async (chat) => {
            if (chat.id !== message.chatId) return chat;
            const updated = {
              ...chat,
              lastMessage: message,
              updatedAt: message.createdAt,
              unreadCount: isFromMe ? chat.unreadCount : chat.unreadCount + 1,
            };
            return decryptLastMessage(updated, myUserIdRef.current);
          }),
        );
        setAndMirror(updatedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      };

      const handleUserOnline = ({ userId }: { userId: string }) => {
        setAndMirror(
          chatsRef.current.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.userId === userId ? { ...p, user: { ...p.user, isOnline: true } } : p,
            ),
          })),
        );
      };

      const handleUserOffline = ({ userId }: { userId: string }) => {
        setAndMirror(
          chatsRef.current.map((chat) => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.userId === userId ? { ...p, user: { ...p.user, isOnline: false } } : p,
            ),
          })),
        );
      };

      const handleChatNew    = () => loadChats();
      const handleMessageRead = () => loadChats();

      const handleGroupUpdated = ({ chatId: id, name: newName, avatar: newAvatar }: {
        chatId: string; name?: string; avatar?: string | null;
      }) => {
        setAndMirror(
          chatsRef.current.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...(newName !== undefined && { name: newName }),
                  ...(newAvatar !== undefined && { avatar: newAvatar }),
                }
              : c,
          ),
        );
      };

      sock.on('message:new',   handleMessageNew);
      sock.on('message:read',  handleMessageRead);
      sock.on('user:online',   handleUserOnline);
      sock.on('user:offline',  handleUserOffline);
      sock.on('chat:new',      handleChatNew);
      sock.on('group:updated', handleGroupUpdated);

      off = () => {
        sock.off('message:new',   handleMessageNew);
        sock.off('message:read',  handleMessageRead);
        sock.off('user:online',   handleUserOnline);
        sock.off('user:offline',  handleUserOffline);
        sock.off('chat:new',      handleChatNew);
        sock.off('group:updated', handleGroupUpdated);
      };
    }).catch(() => { setLoading(false); });

    return () => { off?.(); };
  // loadChats and setAndMirror are stable; myUserIdRef is a ref — intentionally
  // we want this effect to run exactly once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { chats, filteredChats, chatFilter, setChatFilter, contacts, nicknames, loading, refreshing, loadingMore, hasMore, pendingDelete, loadChats, loadNicknames, loadMore, onRefresh, deleteConversation, markAsRead };
}
