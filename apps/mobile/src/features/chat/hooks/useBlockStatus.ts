import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { settingsApi, chatApi } from '@/shared/services/api';
import { confirm } from '@/shared/utils/alert';

interface UseBlockStatusParams {
  recipientId: string;
  isGroup: boolean;
  chatId: string | null;
}

export interface UseBlockStatusReturn {
  isBlocked: boolean;
  setIsBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  handleUnblock: () => Promise<void>;
  handleDeleteConversation: () => Promise<void>;
}

export function useBlockStatus({
  recipientId,
  isGroup,
  chatId,
}: UseBlockStatusParams): UseBlockStatusReturn {
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!isGroup && recipientId) {
        settingsApi.getBlocked()
          .then(({ blocked }) =>
            setIsBlocked(blocked.some((b) => b.blockedUserId === recipientId)),
          )
          .catch(() => {});
      }
    }, [isGroup, recipientId]),
  );

  const handleUnblock = useCallback(async () => {
    const ok = await confirm(
      'Unblock Contact',
      'Unblock this contact? They will be able to message and call you again.',
      'Unblock',
    );
    if (!ok) return;
    try {
      await settingsApi.unblockUser(recipientId);
      setIsBlocked(false);
    } catch { /* ignore */ }
  }, [recipientId]);

  const handleDeleteConversation = useCallback(async () => {
    if (!chatId) return;
    const ok = await confirm(
      'Delete Chat',
      'This will delete the conversation for you. This cannot be undone.',
      'Delete',
    );
    if (!ok) return;
    try {
      await chatApi.deleteConversation(chatId);
      router.back();
    } catch { /* ignore */ }
  }, [chatId, router]);

  return { isBlocked, setIsBlocked, handleUnblock, handleDeleteConversation };
}
