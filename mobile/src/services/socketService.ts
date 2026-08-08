import { io, Socket } from 'socket.io-client';
import { SERVER_URL, REQUEST_TIMEOUT_MS } from '../constants/config';

let socket: Socket | null = null;

/** Crée la connexion au serveur si elle n'existe pas déjà */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: REQUEST_TIMEOUT_MS,
  });

  socket.on('connect', () => console.log('[socket] connecté à', SERVER_URL));
  socket.on('disconnect', (reason) => console.log('[socket] déconnecté :', reason));
  socket.on('connect_error', (error) =>
    console.log('[socket] connexion impossible :', error.message)
  );

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
