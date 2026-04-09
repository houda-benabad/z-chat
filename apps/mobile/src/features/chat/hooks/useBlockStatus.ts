import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { settingsApi } from '@/shared/services/api';
import { confirm } from '@/shared/utils/alert';

interface UseBlockStatusParams {
  recipientId: string;
  isGroup: boolean;
}

export interface UseBlockStatusReturn {
  isBlocked: boolean;
  setIsBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  handleUnblock: () => Promise<void>;
}

export function useBlockStatus({
  recipientId,
  isGroup,
}: UseBlockStatusParams): UseBlockStatusReturn {
  const [isBlocked, setIsBlocked] = useState(false);

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

  return { isBlocked, setIsBlocked, handleUnblock };
}
