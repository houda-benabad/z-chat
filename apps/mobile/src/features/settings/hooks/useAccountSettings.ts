import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { settingsApi, tokenStorage } from '@/shared/services/api';

export function useAccountSettings() {
  const router = useRouter();

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, messages, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type confirmation to proceed. All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await settingsApi.deleteAccount();
                      await tokenStorage.remove();
                      router.replace('/');
                    } catch {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [router]);

  return {
    handleDeleteAccount,
  };
}
