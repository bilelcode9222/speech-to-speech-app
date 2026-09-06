import { createHmac, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { Socket } from 'socket.io';
import { config } from '../config/env';

export interface AnonymousSession {
  installationId: string;
  issuedAt: number;
  expiresAt: number;
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INSTALLATION_ID = /^[a-zA-Z0-9_-]{20,160}$/;

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signature(payload: string): string {
  return createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

export function isValidInstallationId(value: unknown): value is string {
  return typeof value === 'string' && INSTALLATION_ID.test(value);
}

export function issueAnonymousSession(installationId: string): { token: string; expiresAt: number } {
  if (!isValidInstallationId(installationId)) {
    throw new Error("Identifiant d'installation invalide.");
  }

  const now = Date.now();
  const session: AnonymousSession = {
    installationId,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };
  const payload = encode(JSON.stringify(session));
  return { token: `${payload}.${signature(payload)}`, expiresAt: session.expiresAt };
}

export function verifyAnonymousSession(token: unknown): AnonymousSession | null {
  if (typeof token !== 'string') return null;
  const [payload, receivedSignature, extra] = token.split('.');
  if (!payload || !receivedSignature || extra) return null;

  const expected = signature(payload);
  const a = Buffer.from(receivedSignature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(decode(payload)) as AnonymousSession;
    if (!isValidInstallationId(session.installationId)) return null;
    if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function bearer(req: Request): string | null {
  const value = req.header('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

export function requireAnonymousHttpSession(req: Request, res: Response, next: NextFunction): void {
  const session = verifyAnonymousSession(bearer(req));
  if (!session) {
    res.status(401).json({ error: 'Session anonyme absente ou expirée.' });
    return;
  }
  res.locals.anonymousSession = session;
  next();
}

export function requireAnonymousSocketSession(socket: Socket, next: (error?: Error) => void): void {
  const session = verifyAnonymousSession(socket.handshake.auth?.token);
  if (!session) {
    next(new Error('UNAUTHORIZED'));
    return;
  }
  socket.data.anonymousSession = session;
  next();
}

export function socketInstallationId(socket: Socket): string {
  const session = socket.data.anonymousSession as AnonymousSession | undefined;
  return session?.installationId || socket.id;
}
