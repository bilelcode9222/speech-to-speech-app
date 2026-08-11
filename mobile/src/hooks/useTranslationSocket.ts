import { useEffect } from 'react';
import { getSocket } from '../services/socketService';
import { playBase64Audio } from '../services/audioPlayer';
import { speakText } from '../services/deviceSpeech';
import { useAppStore } from '../store/appStore';
import { PipelineErrorPayload, PipelineResult, SOCKET_EVENTS } from '../types';

/** Pause avant la lecture, pour laisser le temps de lire la traduction */
const DELAI_AVANT_VOIX_MS = 800;

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

      await new Promise((r) => setTimeout(r, DELAI_AVANT_VOIX_MS));

      try {
        if (result.audioBase64) {
          await playBase64Audio(result.audioBase64, result.audioFormat || 'mp3');
        } else {
          // Pas d'audio renvoyé : c'est l'iPhone qui prononce
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
