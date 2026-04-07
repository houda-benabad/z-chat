import { useState, useCallback, useEffect } from 'react';
import { settingsApi } from '@/shared/services/api';

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

  useEffect(() => {
    if (!isGroup && recipientId) {
      settingsApi.getBlocked()
        .then(({ blocked }) =>
          setIsBlocked(blocked.some((b) => b.blockedUserId === recipientId)),
        )
        .catch(() => {});
    }
  }, [isGroup, recipientId]);

  const handleUnblock = useCallback(async () => {
    try {
      await settingsApi.unblockUser(recipientId);
      setIsBlocked(false);
    } catch { /* ignore */ }
  }, [recipientId]);

  return { isBlocked, setIsBlocked, handleUnblock };
}
