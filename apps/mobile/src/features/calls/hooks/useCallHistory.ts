import { useState, useCallback, useEffect } from 'react';
import { callsApi } from '@/shared/services/api';
import type { CallRecord } from '@/types';

export function useCallHistory() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchCalls = useCallback(async (cursor?: string) => {
    try {
      const result = await callsApi.getCallHistory(cursor);
      if (cursor) {
        setCalls((prev) => [...prev, ...result.calls]);
      } else {
        setCalls(result.calls);
      }
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch {
      // Silently fail — user sees empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchCalls();
  }, [fetchCalls]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor) {
      fetchCalls(nextCursor);
    }
  }, [hasMore, nextCursor, fetchCalls]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  return { calls, loading, refreshing, hasMore, refresh, loadMore };
}
