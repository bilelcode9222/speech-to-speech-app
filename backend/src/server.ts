import http from 'http';
import os from 'os';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

import { config } from './config/env';
import { logger } from './utils/logger';
import { registerTranslationSocket } from './sockets/translationSocket';
import { registerLiveSocket } from './sockets/liveSocket';
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

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: config.provider,
    ttsProvider: config.ttsProvider,
  });
});

app.get('/languages', (_req, res) => {
  res.json(LANGUAGES);
});

/**
 * Bootstrap invisible de l'app : aucun compte utilisateur.
 * Le téléphone crée un identifiant d'installation aléatoire et reçoit un
 * jeton signé valable 7 jours. La signature empêche le client de fabriquer
 * ou modifier lui-même une session reconnue par le backend.
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

app.post('/api/translate', requireAnonymousHttpSession, async (req, res, next) => {
  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    const limit = consumeRateLimit(`translate:${session.installationId}`, 20, 60_000);
    if (!limit.allowed) {
      res.setHeader('Retry-After', Math.ceil(limit.retryAfterMs / 1000));
      res.status(429).json({ error: 'Trop de traductions. Patiente une minute.' });
      return;
    }

    const result = await runSpeechPipeline(req.body as TranslationRequest);
    res.json(result);
  } catch (error) {
    next(error instanceof StageError ? error : new Error(String(error)));
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 25 * 1024 * 1024,
});

// Toutes les connexions Socket.IO doivent présenter un jeton anonyme valide.
io.use(requireAnonymousSocketSession);
registerTranslationSocket(io);
registerLiveSocket(io);

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
