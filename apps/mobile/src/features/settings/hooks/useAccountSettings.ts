import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { settingsApi, tokenStorage } from '@/shared/services/api';
import { alert, confirm } from '@/shared/utils/alert';

export function useAccountSettings() {
  const router = useRouter();

  const handleDeleteAccount = useCallback(async () => {
    const first = await confirm(
      'Delete Account',
      'This will permanently delete your account, messages, and all data. This cannot be undone.',
      'Delete Account',
      true,
    );
    if (!first) return;
    const second = await confirm(
      'Are you absolutely sure?',
      'All your data will be permanently deleted.',
      'Yes, Delete',
      true,
    );
    if (!second) return;
    try {
      await settingsApi.deleteAccount();
      await tokenStorage.remove();
      router.replace('/');
    } catch {
      alert('Error', 'Failed to delete account');
    }
  }, [router]);

  return {
    handleDeleteAccount,
  };
}
