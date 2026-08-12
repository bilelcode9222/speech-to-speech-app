import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socketService';
import { playBase64Audio } from '../services/audioPlayer';
import { speakText } from '../services/deviceSpeech';
import { useAppStore } from '../store/appStore';
import { PipelineErrorPayload, PipelineResult, SOCKET_EVENTS } from '../types';

/**
 * Délai au-delà duquel une traduction est abandonnée.
 *
 * Sans ce garde-fou, une requête sans réponse — serveur en veille, coupure
 * réseau, erreur silencieuse — laisse l'échange en attente indéfiniment. Le
 * bouton reste grisé sur "traduction en cours" et l'app devient inutilisable
 * jusqu'à un redémarrage complet.
 */
const TIMEOUT_MS = 45_000;

export function useTranslationSocket(): void {
  const { updateExchange, setConnected } = useAppStore();

  /** Un minuteur par requête en cours */
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const socket = getSocket();

    const clearTimer = (requestId: string) => {
      const timer = timers.current.get(requestId);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(requestId);
      }
    };

    const onConnect = () => setConnected(true);

    const onDisconnect = () => {
      setConnected(false);
      // La connexion est perdue : toute requête en vol est perdue avec elle.
      // On libère l'interface au lieu de la laisser figée.
      for (const [requestId, timer] of timers.current) {
        clearTimeout(timer);
        updateExchange(requestId, {
          status: 'error',
          errorMessage: 'Connexion au serveur perdue. Réessaie.',
        });
      }
      timers.current.clear();
    };

    const onTranscription = ({ requestId, text }: { requestId: string; text: string }) => {
      updateExchange(requestId, { originalText: text, status: 'translating' });
    };

    const onTranslation = ({ requestId, text }: { requestId: string; text: string }) => {
      updateExchange(requestId, { translatedText: text, status: 'speaking' });
    };

    const onAudio = async (result: PipelineResult) => {
      clearTimer(result.requestId);

      updateExchange(result.requestId, {
        originalText: result.originalText,
        translatedText: result.translatedText,
        timings: result.timings,
        status: 'done',
      });

      try {
        if (result.audioBase64) {
          await playBase64Audio(result.audioBase64, result.audioFormat || 'mp3');
        } else {
          // Pas d'audio renvoyé : le serveur est en mode 'device', ou la voix
          // a échoué et le repli s'est déclenché. L'iPhone prononce.
          const exchange = useAppStore
            .getState()
            .exchanges.find((e) => e.id === result.requestId);
          await speakText(result.translatedText, exchange?.targetLanguage || 'en');
        }
      } catch (error) {
        console.log('[voix] lecture impossible', error);
      }
    };

    const onError = ({ requestId, message }: PipelineErrorPayload) => {
      clearTimer(requestId);
      updateExchange(requestId, { status: 'error', errorMessage: message });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.TRANSCRIPTION_READY, onTranscription);
    socket.on(SOCKET_EVENTS.TRANSLATION_READY, onTranslation);
    socket.on(SOCKET_EVENTS.AUDIO_READY, onAudio);
    socket.on(SOCKET_EVENTS.PIPELINE_ERROR, onError);

    if (socket.connected) setConnected(true);

    const pending = timers.current;

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.TRANSCRIPTION_READY, onTranscription);
      socket.off(SOCKET_EVENTS.TRANSLATION_READY, onTranslation);
      socket.off(SOCKET_EVENTS.AUDIO_READY, onAudio);
      socket.off(SOCKET_EVENTS.PIPELINE_ERROR, onError);
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, [updateExchange, setConnected]);
}

/**
 * Arme le minuteur d'abandon pour une requête.
 * À appeler depuis l'écran, juste après l'envoi au serveur.
 */
export function armTimeout(
  requestId: string,
  updateExchange: (id: string, patch: Record<string, unknown>) => void
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    updateExchange(requestId, {
      status: 'error',
      errorMessage:
        "Le serveur n'a pas répondu. Il était peut-être en veille — réessaie.",
    });
  }, TIMEOUT_MS);
}
