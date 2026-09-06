import { Server, Socket } from 'socket.io';
import { GeminiLiveSession } from '../services/geminiLiveService';
import { logger } from '../utils/logger';
import { socketInstallationId } from '../security/anonymousSession';
import { consumeRateLimit } from '../security/rateLimit';

export const LIVE_EVENTS = {
  START: 'live_start',
  AUDIO_IN: 'live_audio_in',
  STOP: 'live_stop',
  TEXT: 'live_text',
  AUDIO_OUT: 'live_audio_out',
  TURN_END: 'live_turn_end',
  ERROR: 'live_error',
} as const;

interface StartPayload {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export function registerLiveSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    let session: GeminiLiveSession | null = null;
    let currentId: string | null = null;
    const installationId = socketInstallationId(socket);
    const ip = socket.handshake.address || 'unknown';

    socket.on(LIVE_EVENTS.START, (payload: StartPayload) => {
      const installationLimit = consumeRateLimit(
        `live-install:${installationId}`,
        8,
        60_000
      );
      const ipLimit = consumeRateLimit(`live-ip:${ip}`, 20, 60_000);

      if (!installationLimit.allowed || !ipLimit.allowed) {
        socket.emit(LIVE_EVENTS.ERROR, {
          sessionId: payload?.sessionId || null,
          message: 'Trop de sessions live. Patiente une minute.',
        });
        return;
      }

      session?.close();
      currentId = payload.sessionId;

      logger.info(
        `Live ${payload.sessionId} : ${payload.sourceLanguage} -> ${payload.targetLanguage}`
      );

      session = new GeminiLiveSession(
        payload.sourceLanguage,
        payload.targetLanguage,
        {
          onText: (text) => socket.emit(LIVE_EVENTS.TEXT, { sessionId: currentId, text }),
          onAudio: (pcm) => socket.emit(LIVE_EVENTS.AUDIO_OUT, { sessionId: currentId, pcm }),
          onTurnComplete: () => socket.emit(LIVE_EVENTS.TURN_END, { sessionId: currentId }),
          onError: (message) =>
            socket.emit(LIVE_EVENTS.ERROR, { sessionId: currentId, message }),
        }
      );

      session.connect();
    });

    socket.on(LIVE_EVENTS.AUDIO_IN, ({ pcm }: { pcm: string }) => {
      session?.sendAudio(pcm);
    });

    socket.on(LIVE_EVENTS.STOP, () => {
      session?.finishTurn();
      setTimeout(() => {
        session?.close();
        session = null;
      }, 5000);
    });

    socket.on('disconnect', () => {
      session?.close();
      session = null;
    });
  });
}
