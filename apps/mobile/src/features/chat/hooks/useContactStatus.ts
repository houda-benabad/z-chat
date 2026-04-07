import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { contactApi, userApi } from '@/shared/services/api';

interface UseContactStatusParams {
  recipientId: string;
  isGroup: boolean;
}

export interface UseContactStatusReturn {
  isContact: boolean;
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
  const [recipientPhone, setRecipientPhone] = useState<string | null>(null);
  const [recipientProfileName, setRecipientProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (isGroup || !recipientId) return;

    // Fetch contacts and check if recipientId is among them
    contactApi.getContacts(0, 500).then(({ contacts }) => {
      const found = contacts.some((c) => c.contactUserId === recipientId);
      setIsContact(found);
    }).catch(() => {});

    // Fetch recipient's phone and profile name for the add flow
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

  return { isContact, recipientPhone, recipientProfileName, handleAddContact };
}
