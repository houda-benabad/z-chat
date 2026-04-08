import { useEffect } from 'react';
import { decryptChatMessage } from '../utils/decryptChatMessage';
import type { ChatMessage } from '@/types';
import type { Socket } from 'socket.io-client';

interface UseChatSocketParams {
  socket: Socket | null;
  chatId: string;
  myUserId: string;
  recipientId: string;
  isGroup: boolean;
  recipientPublicKey: string | null;
  groupKey: string | null;
  onNewMessage: (message: ChatMessage) => void;
  onRead: (messageId: string) => void;
  onTypingStart: (userId: string) => void;
  onTypingStop: (userId: string) => void;
  onOnline: () => void;
  onOffline: () => void;
  onKeyUpdated: () => void;
  onMessageDeleted: (messageId: string) => void;
}

/**
 * Binds and cleans up all Socket.IO event listeners for an open chat.
 * Pure side-effect hook — no returned state.
 */
export function useChatSocket({
  socket,
  chatId,
  myUserId,
  recipientId,
  isGroup,
  recipientPublicKey,
  groupKey,
  onNewMessage,
  onRead,
  onTypingStart,
  onTypingStop,
  onOnline,
  onOffline,
  onKeyUpdated,
  onMessageDeleted,
}: UseChatSocketParams): void {
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNew = async (message: ChatMessage) => {
      if (message.chatId !== chatId) return;

      const decrypted = await decryptChatMessage(message, {
        isGroup,
        recipientPublicKey,
        groupKey,
      });

      onNewMessage(decrypted);

      if (message.senderId !== myUserId) {
        socket.emit('message:read', { chatId, messageId: message.id });
      }
    };

    const handleTypingStart = (d: { chatId: string; userId: string }) => {
      if (d.chatId === chatId && d.userId !== myUserId) onTypingStart(d.userId);
    };
    const handleTypingStop = (d: { chatId: string; userId: string }) => {
      if (d.chatId === chatId) onTypingStop(d.userId);
    };
    const handleOnline = (d: { userId: string }) => {
      if (d.userId === recipientId) onOnline();
    };
    const handleOffline = (d: { userId: string }) => {
      if (d.userId === recipientId) onOffline();
    };
    const handleRead = (d: { chatId: string; userId: string; messageId: string }) => {
      if (d.chatId === chatId && d.userId !== myUserId) onRead(d.messageId);
    };
    const handleKeyUpdated = (d: { chatId: string }) => {
      if (d.chatId === chatId) onKeyUpdated();
    };
    const handleDeleted = (d: { chatId: string; messageId: string }) => {
      if (d.chatId === chatId) onMessageDeleted(d.messageId);
    };

    socket.on('message:new', handleNew);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('message:read', handleRead);
    socket.on('group:key_updated', handleKeyUpdated);
    socket.on('message:deleted', handleDeleted);

    return () => {
      socket.off('message:new', handleNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('message:read', handleRead);
      socket.off('group:key_updated', handleKeyUpdated);
      socket.off('message:deleted', handleDeleted);
    };
  }, [
    socket, chatId, myUserId, recipientId, isGroup,
    recipientPublicKey, groupKey,
    onNewMessage, onRead, onTypingStart, onTypingStop, onOnline, onOffline, onKeyUpdated, onMessageDeleted,
  ]);
}
