import { io, Socket } from 'socket.io-client';
import { tokenStorage, API_BASE_URL } from './api';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await tokenStorage.get();
  if (!token) throw new Error('No auth token');

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return new Promise((resolve, reject) => {
    let authRetried = false;

    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);

    socket!.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket!);
    });

    socket!.on('connect_error', async (err) => {
      // On auth failure, try once to get a fresh token and reconnect
      if (!authRetried && err.message.includes('token')) {
        authRetried = true;
        const freshToken = await tokenStorage.get();
        if (freshToken && socket) {
          socket.auth = { token: freshToken };
          socket.connect();
          return;
        }
      }
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
