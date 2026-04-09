import { useState, useCallback, useMemo } from 'react';
import type { ChatMessage } from '@/types';

export function useMessageSearch(messages: ChatMessage[]) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return messages.filter(
      (m) => !m.isDeleted && m.type === 'text' && m.content?.toLowerCase().includes(q)
    );
  }, [searchQuery, messages]);

  const handleQueryChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const clearQuery = useCallback(() => setSearchQuery(''), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  return {
    searchOpen,
    searchQuery,
    searchResults,
    openSearch,
    closeSearch,
    handleQueryChange,
    clearQuery,
  };
}
