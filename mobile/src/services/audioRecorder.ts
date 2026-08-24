import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Demande l'autorisation micro et configure la session audio.
 * À appeler une fois au lancement de l'app.
 */
export async function prepareAudioSession(): Promise<boolean> {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (!permission.granted) return false;

  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  return true;
}

/** Hook de bas niveau, réexporté pour garder les imports centralisés */
export function useRecorder() {
  // isMeteringEnabled expose le niveau sonore dans l'état du recorder,
  // ce qui permet de détecter les silences et d'arrêter automatiquement.
  return useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
}

/** Lit le fichier enregistré et le convertit en base64 pour l'envoi réseau */
export async function readRecordingAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

/** Extension du fichier produit par l'enregistreur (m4a sur iOS et Android) */
export function formatFromUri(uri: string): string {
  const match = uri.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'm4a';
}
