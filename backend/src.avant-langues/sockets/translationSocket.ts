import { Server, Socket } from 'socket.io';
import { runSpeechPipeline } from '../pipeline/speechPipeline';
import { logger } from '../utils/logger';
import {
  SOCKET_EVENTS,
  StageError,
  TranslationRequest,
} from '../types';

/** Limite anti-abus : nombre de requêtes autorisées par minute et par client */
const MAX_REQUESTS_PER_MINUTE = 20;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(socketId);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(socketId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_MINUTE;
}

export function registerTranslationSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connecté : ${socket.id}`);

    socket.on(SOCKET_EVENTS.TRANSLATE, async (payload: TranslationRequest) => {
      const requestId = payload?.requestId || 'inconnu';

      if (isRateLimited(socket.id)) {
        socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, {
          requestId,
          stage: 'unknown',
          message: 'Trop de requêtes. Patiente une minute.',
        });
        return;
      }

      try {
        const result = await runSpeechPipeline(payload, {
          // Résultats intermédiaires : le texte apparaît avant la voix
          onTranscription: (text) =>
            socket.emit(SOCKET_EVENTS.TRANSCRIPTION_READY, { requestId, text }),
          onTranslation: (text) =>
            socket.emit(SOCKET_EVENTS.TRANSLATION_READY, { requestId, text }),
        });

        socket.emit(SOCKET_EVENTS.AUDIO_READY, result);
      } catch (error) {
        const stage = error instanceof StageError ? error.stage : 'unknown';
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue du serveur.';

        logger.error(`Pipeline ${requestId} en échec (${stage})`, error);
        socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, { requestId, stage, message });
      }
    });

    socket.on('disconnect', () => {
      requestCounts.delete(socket.id);
      logger.info(`Client déconnecté : ${socket.id}`);
    });
  });
}
