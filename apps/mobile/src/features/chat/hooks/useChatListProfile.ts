import { useUserProfile } from '@/shared/context/UserProfileContext';
import type { UserProfile } from '@/types';

export interface UseChatListProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
}

export function useChatListProfile(): UseChatListProfileReturn {
  const { profile, loading } = useUserProfile();
  return { profile, loading };
}
