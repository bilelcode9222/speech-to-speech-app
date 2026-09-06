import { Server, Socket } from 'socket.io';
import { runSpeechPipeline } from '../pipeline/speechPipeline';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS, StageError, TranslationRequest } from '../types';
import { socketInstallationId } from '../security/anonymousSession';
import { consumeRateLimit } from '../security/rateLimit';

export function registerTranslationSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const installationId = socketInstallationId(socket);
    logger.info(`Client anonyme connecté : ${installationId.slice(0, 12)}…`);

    socket.on(SOCKET_EVENTS.TRANSLATE, async (payload: TranslationRequest) => {
      const requestId = payload?.requestId || 'inconnu';
      const limit = consumeRateLimit(`translate:${installationId}`, 20, 60_000);

      if (!limit.allowed) {
        socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, {
          requestId,
          stage: 'unknown',
          message: 'Trop de requêtes. Patiente une minute.',
        });
        return;
      }

      try {
        const result = await runSpeechPipeline(payload, {
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
      logger.info(`Client anonyme déconnecté : ${installationId.slice(0, 12)}…`);
    });
  });
}
