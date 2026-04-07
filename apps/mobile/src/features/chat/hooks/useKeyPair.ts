import { useState, useEffect } from 'react';
import { getOrCreateKeyPair } from '@/shared/services/crypto';
import { userApi } from '@/shared/services/api';

export function useKeyPair(): { encryptionError: string | null } {
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateKeyPair()
      .then((pubKey) => userApi.uploadPublicKey(pubKey))
      .catch(() => {
        setEncryptionError('Encryption setup failed — please restart the app.');
      });
  }, []);

  return { encryptionError };
}
