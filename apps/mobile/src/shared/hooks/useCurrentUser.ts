import { useState, useEffect } from 'react';
import { tokenStorage } from '../services/api';
import { parseJwtUserId } from '../utils/index';
import { useUserProfile } from '../context/UserProfileContext';

// Module-level JWT cache: populated on first async read so that re-mounts
// get the id synchronously (handles the fast-socket / slow-SecureStore race).
let _cachedUserId = '';

/** Call on logout to clear the cache. */
export function clearCurrentUserIdCache(): void {
  _cachedUserId = '';
}

export interface CurrentUser {
  userId: string;
  loading: boolean;
}

/**
 * Returns the current user's ID and a loading flag.
 * Primary source: UserProfileContext.profile.id (fetched at app root, shared).
 * Fallback: JWT sub claim (parsed async, cached in module-level var).
 * loading is true only while both sources are still resolving.
 */
export function useCurrentUser(): CurrentUser {
  // profile is fetched by UserProfileProvider at the root — shared across all
  // components, so it doesn't race with per-component effects.
  const { profile } = useUserProfile();

  const [jwtUserId, setJwtUserId] = useState(() => _cachedUserId);

  useEffect(() => {
    if (_cachedUserId) return;
    tokenStorage.get().then((token) => {
      if (token) {
        const id = parseJwtUserId(token);
        if (id) {
          _cachedUserId = id;
          setJwtUserId(id);
        }
      }
    });
  }, []);

  // profile.id is authoritative; fall back to JWT while the profile is loading
  const userId = profile?.id ?? jwtUserId;
  return { userId, loading: !userId };
}
