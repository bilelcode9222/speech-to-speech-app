import { Socket } from 'socket.io';

export function socketClientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(',')[0].trim();
  }

  return socket.handshake.address || 'unknown';
}
