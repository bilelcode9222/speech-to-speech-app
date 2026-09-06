import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '../services/socketService';
import { playBase64Audio } from '../services/audioPlayer';
import { speakText } from '../services/deviceSpeech';
import { useAppStore } from '../store/appStore';
import { PipelineErrorPayload, PipelineResult, SOCKET_EVENTS } from '../types';
import { REQUEST_TIMEOUT_MS } from '../constants/config';

interface Options {
  onAccessError?: (code: string, message: string) => void;
}

export function useTranslationSocket(options: Options = {}): {
  armTimeout: (requestId: string) => void;
} {
  const { updateExchange, setConnected } = useAppStore();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const accessErrorRef = useRef(options.onAccessError);
  accessErrorRef.current = options.onAccessError;

  const clearTimer = useCallback((requestId: string) => {
    const timer = timers.current.get(requestId);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(requestId);
    }
  }, []);

  const armTimeout = useCallback(
    (requestId: string) => {
      clearTimer(requestId);
      const timer = setTimeout(() => {
        timers.current.delete(requestId);
        updateExchange(requestId, {
          status: 'error',
          errorMessage: "Le serveur n'a pas répondu. Réessaie.",
        });
      }, REQUEST_TIMEOUT_MS);
      timers.current.set(requestId, timer);
    },
    [clearTimer, updateExchange],
  );

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);

    const onDisconnect = () => {
      setConnected(false);
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
          const exchange = useAppStore
            .getState()
            .exchanges.find((e) => e.id === result.requestId);
          await speakText(result.translatedText, exchange?.targetLanguage || 'en');
        }
      } catch (error) {
        console.log('[voix] lecture impossible', error);
      }
    };

    const onError = ({ requestId, message, code }: PipelineErrorPayload) => {
      clearTimer(requestId);
      updateExchange(requestId, { status: 'error', errorMessage: message });
      if (code) accessErrorRef.current?.(code, message);
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
  }, [clearTimer, updateExchange, setConnected]);

  return { armTimeout };
}
