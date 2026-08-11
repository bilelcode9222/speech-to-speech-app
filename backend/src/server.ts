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

const app = express();

app.use(cors());
// Les audios en base64 sont volumineux : on relève la limite par défaut (100 kb)
app.use(express.json({ limit: '25mb' }));

/** Vérification que le serveur tourne — ouvre cette URL dans ton navigateur */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    sttModel: config.groq.sttModel,
    llmModel: config.groq.llmModel,
    ttsModel: config.elevenLabs.model,
  });
});

/** Liste des langues disponibles */
app.get('/languages', (_req, res) => {
  res.json(LANGUAGES);
});

/** Alternative HTTP au WebSocket, pratique pour tester avec curl */
app.post('/api/translate', async (req, res, next) => {
  try {
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
  maxHttpBufferSize: 25 * 1024 * 1024, // audios volumineux
});

registerTranslationSocket(io);
registerLiveSocket(io);

server.listen(config.port, '0.0.0.0', () => {
  logger.success(`Serveur démarré sur le port ${config.port}`);
  logger.info(`Local     : http://localhost:${config.port}/health`);
  for (const address of localAddresses()) {
    logger.info(`Réseau    : http://${address}:${config.port}/health`);
  }
  logger.info("Utilise l'adresse Réseau dans mobile/src/constants/config.ts");
});

/** Trouve l'IP de la machine sur le réseau local, pour que le téléphone la joigne */
function localAddresses(): string[] {
  const results: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) results.push(iface.address);
    }
  }
  return results;
}

// Un plantage non géré ne doit pas tuer le serveur en silence
process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', reason);
});
