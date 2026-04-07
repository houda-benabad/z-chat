import { useState, useCallback, useRef } from 'react';
import {
  encryptMessage,
  encryptGroupMessage,
} from '@/shared/services/crypto';
import { decryptChatMessage } from '../utils/decryptChatMessage';
import type { ChatMessage } from '@/types';
import type { Socket } from 'socket.io-client';

interface UseMessageComposerParams {
  socket: Socket | null;
  chatId: string;
  myUserId: string;
  isGroup: boolean;
  recipientPublicKey: string | null;
  groupKey: string | null;
  replyToId: string | null;
  initialText?: string;
  onPendingMessage: (msg: ChatMessage) => void;
  onMessageSent: (pendingId: string, message: ChatMessage, plaintext: string) => void;
  onMessageFailed?: (pendingId: string) => void;
  onEncryptionError?: (message: string) => void;
}

export interface UseMessageComposerReturn {
  inputText: string;
  handleTextChange: (text: string) => void;
  handleSend: () => Promise<void>;
}

export function useMessageComposer({
  socket,
  chatId,
  myUserId,
  isGroup,
  recipientPublicKey,
  groupKey,
  replyToId,
  initialText,
  onPendingMessage,
  onMessageSent,
  onMessageFailed,
  onEncryptionError,
}: UseMessageComposerParams): UseMessageComposerReturn {
  const [inputText, setInputText] = useState(initialText ?? '');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!content || !chatId || !socket || !myUserId) return;

    // Require encryption keys before proceeding — no plaintext fallback
    if (!isGroup && !recipientPublicKey) {
      onEncryptionError?.("This contact hasn't set up encryption yet. The message cannot be sent.");
      return;
    }
    if (isGroup && !groupKey) {
      onEncryptionError?.("Group encryption is not ready. The message cannot be sent.");
      return;
    }

    // Encrypt first; only proceed if it succeeds
    let payload: string;
    try {
      if (!isGroup) {
        payload = await encryptMessage(content, recipientPublicKey!);
      } else {
        payload = encryptGroupMessage(content, groupKey!);
      }
    } catch {
      onEncryptionError?.("Failed to encrypt message. Please try again.");
      return;
    }

    setInputText('');
    socket.emit('typing:stop', { chatId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Add pending bubble only after successful encryption
    const pendingId = `pending_${Date.now()}`;
    const now = new Date().toISOString();
    onPendingMessage({
      id: pendingId,
      chatId,
      senderId: myUserId,
      type: 'text',
      content,
      mediaUrl: null,
      replyToId: replyToId ?? null,
      isForwarded: false,
      isDeleted: false,
      disappearsAt: null,
      createdAt: now,
      updatedAt: now,
      sender: { id: myUserId, name: null },
      pending: true,
    });

    socket.emit(
      'message:send',
      { chatId, type: 'text', content: payload, replyToId: replyToId ?? undefined },
      async (res: { message?: ChatMessage; error?: string }) => {
        if (res?.message) {
          const decrypted = await decryptChatMessage(res.message, { isGroup, recipientPublicKey, groupKey });
          onMessageSent(pendingId, decrypted, content);
        } else {
          onMessageFailed?.(pendingId);
        }
      },
    );
  }, [socket, inputText, chatId, myUserId, isGroup, recipientPublicKey, groupKey, replyToId, onPendingMessage, onMessageSent, onMessageFailed, onEncryptionError]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      if (!socket || !chatId) return;

      if (text.length > 0) {
        socket.emit('typing:start', { chatId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { chatId });
          typingTimeoutRef.current = null;
        }, 2000);
      } else {
        socket.emit('typing:stop', { chatId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    },
    [socket, chatId],
  );

  return { inputText, handleTextChange, handleSend };
}
