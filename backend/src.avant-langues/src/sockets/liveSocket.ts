import { Server, Socket } from 'socket.io';
import { GeminiLiveSession } from '../services/geminiLiveService';
import { logger } from '../utils/logger';

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

/**
 * Relais entre l'app mobile et Gemini Live.
 *
 * Volontairement mince : aucun tampon, aucun traitement. Chaque fragment est
 * transmis dès son arrivée, dans les deux sens. Toute mise en file ajouterait
 * de la latence, ce qui irait contre l'objectif.
 *
 * La clé Gemini ne quitte jamais le serveur.
 */
export function registerLiveSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    let session: GeminiLiveSession | null = null;
    let currentId: string | null = null;

    socket.on(LIVE_EVENTS.START, (payload: StartPayload) => {
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
      // La session reste ouverte quelques secondes : le modèle peut encore
      // envoyer la fin de sa traduction après l'arrêt du micro.
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
