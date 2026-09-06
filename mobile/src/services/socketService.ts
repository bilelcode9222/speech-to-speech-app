import { io, Socket } from 'socket.io-client';
import { SERVER_URL, REQUEST_TIMEOUT_MS } from '../constants/config';
import {
  clearAnonymousSession,
  getAnonymousSessionToken,
} from './anonymousSession';

let socket: Socket | null = null;
let connecting = false;

async function connectWithFreshSession(forceRefresh = false): Promise<void> {
  if (!socket || connecting || socket.connected) return;
  connecting = true;

  try {
    const token = await getAnonymousSessionToken(forceRefresh);
    socket.auth = { token };
    socket.connect();
  } catch (error) {
    console.log('[socket] session anonyme impossible :', error);
  } finally {
    connecting = false;
  }
}

/** Crée la connexion au serveur si elle n'existe pas déjà. */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: REQUEST_TIMEOUT_MS,
  });

  socket.on('connect', () => console.log('[socket] connecté à', SERVER_URL));
  socket.on('disconnect', (reason) => console.log('[socket] déconnecté :', reason));
  socket.on('connect_error', async (error) => {
    console.log('[socket] connexion impossible :', error.message);

    if (error.message === 'UNAUTHORIZED') {
      await clearAnonymousSession();
      void connectWithFreshSession(true);
    }
  });

  void connectWithFreshSession();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  connecting = false;
}
