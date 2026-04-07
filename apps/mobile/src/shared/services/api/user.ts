import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { request, tokenStorage, ApiError, API_BASE_URL } from './client';
import type { UserProfile, PublicUserProfile } from '../../../types';

export const userApi = {
  getMe: (): Promise<{ user: UserProfile }> =>
    request('/users/me'),

  getUser: (userId: string): Promise<{ user: PublicUserProfile }> =>
    request(`/users/${userId}`),

  updateProfile: (
    data: { name?: string; about?: string; avatar?: string },
  ): Promise<{ user: UserProfile }> =>
    request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadPublicKey: (
    publicKey: string,
  ): Promise<{ user: { id: string; publicKey: string } }> =>
    request('/users/me/keys', {
      method: 'PATCH',
      body: JSON.stringify({ publicKey }),
    }),

  savePushToken: (pushToken: string | null): Promise<{ ok: boolean }> =>
    request('/users/me/push-token', {
      method: 'PUT',
      body: JSON.stringify({ pushToken }),
    }),
};

export async function uploadMedia(uri: string, mimeType = 'image/jpeg'): Promise<string> {
  try {
    const token = await tokenStorage.get();
    const formData = new FormData();
    const ext = uri.split('.').pop() ?? 'jpg';

    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      formData.append('media', blob, `media.${ext}`);
    } else {
      formData.append('media', { uri, name: `media.${ext}`, type: mimeType } as unknown as Blob);
    }

    const response = await fetch(`${API_BASE_URL}/upload/media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        (typeof body.error === 'string' ? body.error : body.error?.message) ?? 'Upload failed',
      );
    }

    const data = await response.json().catch(() => null) as { url: string } | null;
    if (!data?.url) throw new ApiError(0, 'Upload failed');
    return data.url;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Upload failed');
  }
}

export async function uploadAvatar(uri: string): Promise<string> {
  try {
    const token = await tokenStorage.get();
    const formData = new FormData();

    // Resize to 300×300 before upload to keep avatars small and fast to load
    let uploadUri = uri;
    if (Platform.OS !== 'web') {
      try {
        const resized = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        uploadUri = resized.uri;
      } catch { /* fall through to original */ }
    }

    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] ?? 'jpg';
      formData.append('avatar', blob, `avatar.${ext}`);
    } else {
      const ext = uploadUri.split('.').pop() ?? 'jpg';
      formData.append('avatar', { uri: uploadUri, name: `avatar.${ext}`, type: `image/${ext}` } as unknown as Blob);
    }

    const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        (typeof body.error === 'string' ? body.error : body.error?.message) ?? 'Upload failed',
      );
    }

    const data = await response.json().catch(() => null) as { url: string } | null;
    if (!data?.url) throw new ApiError(0, 'Upload failed');
    return data.url;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Upload failed');
  }
}
