import { useEffect, useRef } from 'react';
import { useAudioRecorderState } from 'expo-audio';

const SPEECH_THRESHOLD_DB = -38;
const SILENCE_DURATION_MS = 1200;
const POLL_INTERVAL_MS = 50;
const MIN_RECORDING_MS = 1300;

export function useSilenceDetection(
  recorder: Parameters<typeof useAudioRecorderState>[0],
  isRecording: boolean,
  onSilenceDetected: () => void
) {
  const state = useAudioRecorderState(recorder, POLL_INTERVAL_MS);

  const heardSpeech = useRef(false);
  const startedAt = useRef(0);
  const silenceSince = useRef<number | null>(null);
  const callbackRef = useRef(onSilenceDetected);
  callbackRef.current = onSilenceDetected;

  useEffect(() => {
    if (isRecording) {
      heardSpeech.current = false;
      silenceSince.current = null;
      startedAt.current = Date.now();
    } else {
      startedAt.current = 0;
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const level = state.metering;
    if (level === undefined) return;

    const now = Date.now();

    if (level > SPEECH_THRESHOLD_DB) {
      heardSpeech.current = true;
      silenceSince.current = null;
      return;
    }

    if (!heardSpeech.current) return;

    if (silenceSince.current === null) {
      silenceSince.current = now;
      return;
    }

    const recordedLongEnough = now - startedAt.current >= MIN_RECORDING_MS;
    if (
      recordedLongEnough &&
      now - silenceSince.current >= SILENCE_DURATION_MS
    ) {
      silenceSince.current = null;
      heardSpeech.current = false;
      callbackRef.current();
    }
  }, [state.metering, isRecording]);
}
