import { Server, Socket } from 'socket.io';
import { runSpeechPipeline } from '../pipeline/speechPipeline';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS, StageError, TranslationRequest } from '../types';
import { socketInstallationId } from '../security/anonymousSession';
import { consumeRateLimit } from '../security/rateLimit';
import {
  accessMessage,
  beginTranslation,
  finishTranslation,
  recordSuccessfulTranslation,
} from '../security/accessControl';
import { socketClientIp } from '../utils/clientIp';

export function registerTranslationSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const installationId = socketInstallationId(socket);
    const ip = socketClientIp(socket);
    logger.info(`Client anonyme connecté : ${installationId.slice(0, 12)}…`);

    socket.on(SOCKET_EVENTS.TRANSLATE, async (payload: TranslationRequest) => {
      const requestId = payload?.requestId || 'inconnu';
      const installationLimit = consumeRateLimit(
        `translate-install:${installationId}`,
        20,
        60_000
      );
      const ipLimit = consumeRateLimit(`translate-ip:${ip}`, 60, 60_000);

      if (!installationLimit.allowed || !ipLimit.allowed) {
        socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, {
          requestId,
          stage: 'unknown',
          code: 'RATE_LIMIT',
          message: 'Trop de requêtes. Patiente une minute.',
        });
        return;
      }

      let started = false;
      try {
        const access = await beginTranslation(installationId);
        if (!access.allowed) {
          socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, {
            requestId,
            stage: 'unknown',
            code: access.code,
            message: accessMessage(access.code),
          });
          return;
        }
        started = true;

        const result = await runSpeechPipeline(payload, {
          onTranscription: (text) =>
            socket.emit(SOCKET_EVENTS.TRANSCRIPTION_READY, { requestId, text }),
          onTranslation: (text) =>
            socket.emit(SOCKET_EVENTS.TRANSLATION_READY, { requestId, text }),
        });

        await recordSuccessfulTranslation(installationId, access.premium);
        socket.emit(SOCKET_EVENTS.AUDIO_READY, result);
      } catch (error) {
        const stage = error instanceof StageError ? error.stage : 'unknown';
        const message =
          error instanceof Error ? error.message : 'Erreur inconnue du serveur.';

        logger.error(`Pipeline ${requestId} en échec (${stage})`, error);
        socket.emit(SOCKET_EVENTS.PIPELINE_ERROR, { requestId, stage, message });
      } finally {
        if (started) finishTranslation(installationId);
      }
    });

    socket.on('disconnect', () => {
      finishTranslation(installationId);
      logger.info(`Client anonyme déconnecté : ${installationId.slice(0, 12)}…`);
    });
  });
}
