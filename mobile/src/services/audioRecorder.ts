import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

/** Demande l'autorisation micro au moment où l'utilisateur veut enregistrer. */
export async function prepareAudioSession(): Promise<boolean> {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (!permission.granted) return false;

  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  return true;
}

export function useRecorder() {
  return useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
}

export async function deleteRecording(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Le fichier peut déjà avoir été nettoyé par le système.
  }
}

/**
 * Lit le fichier puis le supprime immédiatement : Nevi n'a aucune raison de
 * conserver l'enregistrement source une fois qu'il est chargé pour l'envoi.
 */
export async function readRecordingAsBase64(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  } finally {
    await deleteRecording(uri);
  }
}

export function formatFromUri(uri: string): string {
  const match = uri.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'm4a';
}
