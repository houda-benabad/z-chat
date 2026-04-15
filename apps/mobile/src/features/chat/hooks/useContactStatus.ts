import { useState, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { contactApi, userApi } from '@/shared/services/api';

interface UseContactStatusParams {
  recipientId: string;
  isGroup: boolean;
}

export interface UseContactStatusReturn {
  isContact: boolean;
  contactNickname: string | null;
  recipientPhone: string | null;
  recipientProfileName: string | null;
  handleAddContact: () => void;
}

export function useContactStatus({
  recipientId,
  isGroup,
}: UseContactStatusParams): UseContactStatusReturn {
  const router = useRouter();
  const [isContact, setIsContact] = useState(true); // default true to avoid flash
  const [contactNickname, setContactNickname] = useState<string | null>(null);
  const [recipientPhone, setRecipientPhone] = useState<string | null>(null);
  const [recipientProfileName, setRecipientProfileName] = useState<string | null>(null);

  // Re-check contact status every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (isGroup || !recipientId) return;
      contactApi.checkContact(recipientId).then(({ isContact: found, nickname }) => {
        setIsContact(found);
        setContactNickname(nickname);
      }).catch(() => {});
    }, [isGroup, recipientId]),
  );

  // Fetch recipient's phone and profile name for the add flow (only on mount)
  useEffect(() => {
    if (isGroup || !recipientId) return;
    userApi.getUser(recipientId).then(({ user }) => {
      setRecipientPhone(user.phone);
      setRecipientProfileName(user.name);
    }).catch(() => {});
  }, [isGroup, recipientId]);

  const handleAddContact = useCallback(() => {
    const params = new URLSearchParams();
    if (recipientPhone) params.set('prefillPhone', recipientPhone);
    if (recipientProfileName) params.set('prefillName', recipientProfileName);
    router.push(`/add-contact?${params.toString()}`);
  }, [recipientPhone, recipientProfileName, router]);

  return { isContact, contactNickname, recipientPhone, recipientProfileName, handleAddContact };
}
