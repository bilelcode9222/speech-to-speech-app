import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socketService';
import { playChunk, startCapture, stopCapture, stopPlayback } from '../services/livePcm';

export const LIVE_EVENTS = {
  START: 'live_start',
  AUDIO_IN: 'live_audio_in',
  STOP: 'live_stop',
  TEXT: 'live_text',
  AUDIO_OUT: 'live_audio_out',
  TURN_END: 'live_turn_end',
  ERROR: 'live_error',
} as const;

interface LiveState {
  /** Traduction qui s'écrit au fil de la parole */
  text: string;
  isLive: boolean;
  error: string | null;
}

/**
 * Mode instantané.
 *
 * Le micro pousse en continu, la traduction s'affiche pendant qu'on parle, et
 * la voix arrive par fragments joués dès réception. Rien n'attend rien.
 */
export function useLiveTranslation() {
  const [state, setState] = useState<LiveState>({
    text: '',
    isLive: false,
    error: null,
  });

  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onText = ({ text }: { text: string }) => {
      // Les fragments arrivent morceau par morceau et se concatènent
      setState((s) => ({ ...s, text: s.text + text, error: null }));
    };

    const onAudioOut = ({ pcm }: { pcm: string }) => {
      playChunk(pcm);
    };

    const onError = ({ message }: { message: string }) => {
      setState((s) => ({ ...s, error: message, isLive: false }));
      stopCapture();
    };

    socket.on(LIVE_EVENTS.TEXT, onText);
    socket.on(LIVE_EVENTS.AUDIO_OUT, onAudioOut);
    socket.on(LIVE_EVENTS.ERROR, onError);

    return () => {
      socket.off(LIVE_EVENTS.TEXT, onText);
      socket.off(LIVE_EVENTS.AUDIO_OUT, onAudioOut);
      socket.off(LIVE_EVENTS.ERROR, onError);
      stopCapture();
      stopPlayback();
    };
  }, []);

  const start = useCallback(async (sourceLanguage: string, targetLanguage: string) => {
    const id = `live-${Date.now()}`;
    sessionId.current = id;

    setState({ text: '', isLive: true, error: null });

    getSocket().emit(LIVE_EVENTS.START, {
      sessionId: id,
      sourceLanguage,
      targetLanguage,
    });

    try {
      await startCapture((pcm) => {
        getSocket().emit(LIVE_EVENTS.AUDIO_IN, { pcm });
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        isLive: false,
        error: "Le micro n'a pas pu démarrer.",
      }));
    }
  }, []);

  const stop = useCallback(() => {
    stopCapture();
    getSocket().emit(LIVE_EVENTS.STOP, {});
    setState((s) => ({ ...s, isLive: false }));
  }, []);

  return { ...state, start, stop };
}
