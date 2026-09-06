import http from 'http';
import os from 'os';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

import { config } from './config/env';
import { logger } from './utils/logger';
import { registerTranslationSocket } from './sockets/translationSocket';
import { runSpeechPipeline } from './pipeline/speechPipeline';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { LANGUAGES } from './utils/languages';
import { StageError, TranslationRequest } from './types';
import {
  AnonymousSession,
  isValidInstallationId,
  issueAnonymousSession,
  requireAnonymousHttpSession,
  requireAnonymousSocketSession,
} from './security/anonymousSession';
import { consumeRateLimit } from './security/rateLimit';
import {
  accessMessage,
  beginTranslation,
  finishTranslation,
  inspectAccess,
  recordSuccessfulTranslation,
} from './security/accessControl';
import { invalidateRevenueCatCache } from './services/revenueCatService';
import { privacyPage, termsPage } from './legal/pages';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: config.provider,
    ttsProvider: config.ttsProvider,
    durableUsageStore: Boolean(config.databaseUrl),
    revenueCatServerVerification: Boolean(config.revenueCat.apiKey),
  });
});

app.get('/languages', (_req, res) => {
  res.json(LANGUAGES);
});

app.get('/privacy', (_req, res) => {
  res.type('html').send(privacyPage());
});

app.get('/terms', (_req, res) => {
  res.type('html').send(termsPage());
});

/**
 * Bootstrap invisible de l'app : aucun compte utilisateur.
 * Le téléphone crée un identifiant d'installation aléatoire et reçoit un
 * jeton signé valable 7 jours.
 */
app.post('/api/session', (req, res) => {
  const installationId = req.body?.installationId;
  if (!isValidInstallationId(installationId)) {
    res.status(400).json({ error: "Identifiant d'installation invalide." });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const limit = consumeRateLimit(`session:${ip}`, 30, 60 * 60_000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', Math.ceil(limit.retryAfterMs / 1000));
    res.status(429).json({ error: 'Trop de créations de session.' });
    return;
  }

  res.json(issueAnonymousSession(installationId));
});

app.get('/api/access', requireAnonymousHttpSession, async (_req, res, next) => {
  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    res.json(await inspectAccess(session.installationId));
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/access/refresh', requireAnonymousHttpSession, async (_req, res, next) => {
  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    invalidateRevenueCatCache(session.installationId);
    res.json(await inspectAccess(session.installationId));
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/translate', requireAnonymousHttpSession, async (req, res, next) => {
  const session = res.locals.anonymousSession as AnonymousSession;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let started = false;

  try {
    const installationLimit = consumeRateLimit(
      `translate-install:${session.installationId}`,
      20,
      60_000
    );
    const ipLimit = consumeRateLimit(`translate-ip:${ip}`, 60, 60_000);

    if (!installationLimit.allowed || !ipLimit.allowed) {
      const retryAfterMs = Math.max(
        installationLimit.retryAfterMs,
        ipLimit.retryAfterMs
      );
      res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
      res.status(429).json({ code: 'RATE_LIMIT', error: 'Trop de traductions. Patiente une minute.' });
      return;
    }

    const access = await beginTranslation(session.installationId);
    if (!access.allowed) {
      const status = access.code === 'PAYWALL_REQUIRED' ? 402 : 429;
      res.status(status).json({ code: access.code, error: accessMessage(access.code), access });
      return;
    }
    started = true;

    const result = await runSpeechPipeline(req.body as TranslationRequest);
    await recordSuccessfulTranslation(session.installationId, access.premium);
    res.json(result);
  } catch (error) {
    next(error instanceof StageError ? error : new Error(String(error)));
  } finally {
    if (started) finishTranslation(session.installationId);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 12 * 1024 * 1024,
});

io.use(requireAnonymousSocketSession);
registerTranslationSocket(io);
// Gemini Live n'est pas exposé en V1 : surface d'attaque et coûts inutiles
// tant que le client mobile de production ne l'utilise pas.

server.listen(config.port, '0.0.0.0', () => {
  logger.success(`Serveur démarré sur le port ${config.port}`);
  logger.info(`Local     : http://localhost:${config.port}/health`);
  for (const address of localAddresses()) {
    logger.info(`Réseau    : http://${address}:${config.port}/health`);
  }
});

function localAddresses(): string[] {
  const results: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) results.push(iface.address);
    }
  }
  return results;
}

process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', reason);
});
