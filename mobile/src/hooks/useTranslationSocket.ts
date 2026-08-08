import { useEffect } from 'react';
import { getSocket } from '../services/socketService';
import { playBase64Audio } from '../services/audioPlayer';
import { speakText } from '../services/deviceSpeech';
import { useAppStore } from '../store/appStore';
import { PipelineErrorPayload, PipelineResult, SOCKET_EVENTS } from '../types';

/** Pause avant la lecture, pour laisser le temps de lire la traduction */
const DELAI_AVANT_VOIX_MS = 800;

/**
 * Branche les événements du serveur sur le store.
 *
 * L'ordre d'arrivée reproduit le pipeline : le texte transcrit apparaît en
 * premier, puis la traduction, puis la voix. On voit donc quelque chose bien
 * avant la fin du traitement.
 */
export function useTranslationSocket(): void {
  const { updateExchange, setConnected } = useAppStore();

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onTranscription = ({ requestId, text }: { requestId: string; text: string }) => {
      updateExchange(requestId, { originalText: text, status: 'translating' });
    };

    const onTranslation = ({ requestId, text }: { requestId: string; text: string }) => {
      updateExchange(requestId, { translatedText: text, status: 'speaking' });
    };

    const onAudio = async (result: PipelineResult) => {
      updateExchange(result.requestId, {
        originalText: result.originalText,
        translatedText: result.translatedText,
        timings: result.timings,
        status: 'done',
      });

      // Laisse le temps de lire avant que la voix ne démarre
      await new Promise((r) => setTimeout(r, DELAI_AVANT_VOIX_MS));

      try {
        if (result.audioBase64) {
          // Le serveur a fourni un MP3 (ElevenLabs)
          await playBase64Audio(result.audioBase64);
        } else {
          // Pas d'audio : c'est l'iPhone qui prononce
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
      updateExchange(requestId, { status: 'error', errorMessage: message });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SOCKET_EVENTS.TRANSCRIPTION_READY, onTranscription);
    socket.on(SOCKET_EVENTS.TRANSLATION_READY, onTranslation);
    socket.on(SOCKET_EVENTS.AUDIO_READY, onAudio);
    socket.on(SOCKET_EVENTS.PIPELINE_ERROR, onError);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.TRANSCRIPTION_READY, onTranscription);
      socket.off(SOCKET_EVENTS.TRANSLATION_READY, onTranslation);
      socket.off(SOCKET_EVENTS.AUDIO_READY, onAudio);
      socket.off(SOCKET_EVENTS.PIPELINE_ERROR, onError);
    };
  }, [updateExchange, setConnected]);
}
