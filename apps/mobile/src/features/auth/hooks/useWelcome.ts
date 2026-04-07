import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { tokenStorage } from '@/shared/services/api';

export function useWelcome() {
  const router = useRouter();

  useEffect(() => {
    tokenStorage.get().then((token) => {
      if (!token) return;
      try {
        const segment = token.split('.')[1]!;
        const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
        const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        const isExpired = payload.exp && payload.exp * 1000 < Date.now();
        if (isExpired) {
          tokenStorage.remove();
          return;
        }
        router.replace('/chat-list');
      } catch {
        tokenStorage.remove();
      }
    });
  }, [router]);
}
