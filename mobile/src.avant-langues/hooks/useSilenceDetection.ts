import { useEffect, useRef } from 'react';
import { useAudioRecorderState } from 'expo-audio';

/**
 * Détecte la fin de parole et déclenche l'arrêt automatique.
 *
 * Le niveau sonore (metering) est exprimé en décibels : environ -160 dB
 * pour un silence complet, entre -40 et -10 dB pour une voix normale.
 * On considère qu'il y a parole au-dessus du seuil, silence en dessous.
 *
 * Deux garde-fous importants :
 *
 * - L'arrêt ne se déclenche que si de la parole a été entendue AVANT.
 *   Sans cela, l'app couperait immédiatement quand on démarre le micro
 *   et qu'on prend une seconde avant de parler.
 *
 * - Le délai de silence est assez long pour absorber les pauses de
 *   respiration au milieu d'une phrase, mais assez court pour ne pas
 *   faire attendre après le dernier mot.
 */

/** Seuil au-dessus duquel on considère qu'il y a de la parole (dB) */
const SPEECH_THRESHOLD_DB = -38;

/** Durée de silence continu avant de couper (ms) */
const SILENCE_DURATION_MS = 1200;

/** Intervalle de lecture du niveau sonore (ms) */
const POLL_INTERVAL_MS = 50;

/** Durée minimale avant que l'arrêt automatique puisse se déclencher (ms).
 *  Un mot isolé produit sinon un fichier trop court pour être transcrit. */
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
  // Conserve la dernière version du callback sans relancer l'effet
  const callbackRef = useRef(onSilenceDetected);
  callbackRef.current = onSilenceDetected;

  // Remise à zéro à chaque nouvel enregistrement
  useEffect(() => {
    if (isRecording) {
      heardSpeech.current = false;
      silenceSince.current = null;
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) return;

    const level = state.metering;
    if (level === undefined) return;

    const now = Date.now();

    if (level > SPEECH_THRESHOLD_DB) {
      // Parole en cours : on note qu'on a entendu quelque chose et on
      // annule tout décompte de silence en cours.
      heardSpeech.current = true;
      silenceSince.current = null;
      return;
    }

    // Silence. Tant qu'aucune parole n'a été entendue, on attend.
    if (!heardSpeech.current) return;

    if (silenceSince.current === null) {
      silenceSince.current = now;
      return;
    }

    if (now - silenceSince.current >= SILENCE_DURATION_MS) {
      silenceSince.current = null;
      heardSpeech.current = false;
      callbackRef.current();
    }
  }, [state.metering, isRecording]);
}
