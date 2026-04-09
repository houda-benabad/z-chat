import { useState, useCallback } from 'react';
import { chatApi } from '@/shared/services/api';
import {
  encryptMessage,
  encryptGroupMessage,
  decryptGroupKey,
} from '@/shared/services/crypto';
import type { ChatMessage, ChatListItem } from '@/types';
import type { Socket } from 'socket.io-client';

export interface ForwardNavTarget {
  chatId: string;
  name: string;
  avatar: string | null;
  chatType: string;
  recipientId: string;
  recipientAvatar: string | null;
  isOnline: boolean;
}

interface UseForwardModalParams {
  socket: Socket | null;
  myUserId: string;
  onSent: (target: ForwardNavTarget) => void;
}

export interface ForwardRecipient {
  id: string;
  name: string;
  avatar: string | null;
  isGroup: boolean;
}

export interface UseForwardModalReturn {
  visible: boolean;
  sending: boolean;
  search: string;
  selectedIds: Set<string>;
  filteredChats: ForwardRecipient[];
  open: (msg: ChatMessage) => void;
  close: () => void;
  onSearch: (text: string) => void;
  toggleRecipient: (chatId: string) => void;
  handleSend: () => Promise<void>;
}

export function useForwardModal({ socket, myUserId, onSent }: UseForwardModalParams): UseForwardModalReturn {
  const [visible, setVisible]       = useState(false);
  const [message, setMessage]       = useState<ChatMessage | null>(null);
  const [chats, setChats]           = useState<ChatListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState('');
  const [sending, setSending]       = useState(false);

  const open = useCallback(async (msg: ChatMessage) => {
    setMessage(msg);
    setSelectedIds(new Set());
    setSearch('');
    setVisible(true);
    try {
      const { chats: loaded } = await chatApi.getChats(undefined, 200);
      setChats(loaded);
    } catch {
      setChats([]);
    }
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setMessage(null);
    setSelectedIds(new Set());
    setSearch('');
    setSending(false);
  }, []);

  const onSearch = useCallback((text: string) => setSearch(text), []);

  const toggleRecipient = useCallback((chatId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!message || !socket || selectedIds.size === 0) return;
    setSending(true);

    const sends = Array.from(selectedIds).map(async (chatId) => {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;

      const isGroup = chat.type === 'group';
      const plaintext = message.content; // already decrypted in chat state

      let encryptedContent: string | undefined;

      if (plaintext) {
        try {
          if (!isGroup) {
            const other = chat.participants.find((p) => p.userId !== myUserId);
            if (!other?.user.publicKey) return; // skip — no key
            encryptedContent = await encryptMessage(plaintext, other.user.publicKey);
          } else {
            const me = chat.participants.find((p) => p.userId === myUserId);
            if (!me?.encryptedGroupKey) return; // skip — no group key
            const groupKey = await decryptGroupKey(me.encryptedGroupKey);
            if (!groupKey) return;
            encryptedContent = encryptGroupMessage(plaintext, groupKey);
          }
        } catch {
          return; // skip chat if encryption fails
        }
      }

      await new Promise<void>((resolve) => {
        socket.emit(
          'message:send',
          {
            chatId,
            type: message.type,
            ...(encryptedContent !== undefined ? { content: encryptedContent } : {}),
            ...(message.mediaUrl ? { mediaUrl: message.mediaUrl } : {}),
            isForwarded: true,
          },
          () => resolve(),
        );
      });
    });

    await Promise.allSettled(sends);

    // Navigate to the first selected chat after forwarding
    const firstId = Array.from(selectedIds)[0];
    const firstChat = chats.find((c) => c.id === firstId);
    if (firstChat) {
      const isGroup = firstChat.type === 'group';
      const other = isGroup ? null : firstChat.participants.find((p) => p.userId !== myUserId);
      onSent({
        chatId: firstChat.id,
        name: isGroup ? (firstChat.name ?? 'Group') : (other?.user.name ?? 'Unknown'),
        avatar: isGroup ? firstChat.avatar : (other?.user.avatar ?? null),
        chatType: firstChat.type,
        recipientId: other?.userId ?? '',
        recipientAvatar: other?.user.avatar ?? null,
        isOnline: other?.user.isOnline ?? false,
      });
    }

    close();
  }, [message, socket, selectedIds, chats, myUserId, onSent, close]);

  const q = search.toLowerCase().trim();
  const filteredChats: ForwardRecipient[] = chats
    .map((c) => {
      const isGroup = c.type === 'group';
      const name = isGroup
        ? (c.name ?? 'Group')
        : (c.participants.find((p) => p.userId !== myUserId)?.user.name ?? 'Unknown');
      const avatar = isGroup
        ? c.avatar
        : (c.participants.find((p) => p.userId !== myUserId)?.user.avatar ?? null);
      return { id: c.id, name, avatar, isGroup };
    })
    .filter((r) => !q || r.name.toLowerCase().includes(q));

  return {
    visible,
    sending,
    search,
    selectedIds,
    filteredChats,
    open,
    close,
    onSearch,
    toggleRecipient,
    handleSend,
  };
}
