import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

let counter = 0;
let activePlayer: ReturnType<typeof createAudioPlayer> | null = null;
let activePath: string | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

async function cleanupActivePlayback(): Promise<void> {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  const player = activePlayer;
  const path = activePath;
  activePlayer = null;
  activePath = null;

  try {
    player?.pause();
  } catch {
    // Le lecteur peut déjà être arrêté.
  }
  try {
    player?.remove();
  } catch {
    // Le lecteur peut déjà être libéré.
  }
  if (path) {
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
  }
}

/** Coupe immédiatement une traduction vocale en cours avant un nouvel enregistrement. */
export async function stopAudioPlayback(): Promise<void> {
  await cleanupActivePlayback();
}

export async function playBase64Audio(
  audioBase64: string,
  format: 'wav' | 'mp3' = 'mp3'
): Promise<void> {
  await cleanupActivePlayback();

  const path = `${FileSystem.cacheDirectory}traduction-${counter++}.${format}`;
  await FileSystem.writeAsStringAsync(path, audioBase64, { encoding: 'base64' });

  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri: path });
  activePlayer = player;
  activePath = path;
  player.play();

  // Garde-fou : une réponse anormalement longue ne doit pas conserver le
  // lecteur/fichier indéfiniment. 2 minutes couvrent largement une requête
  // Nevi limitée à 60 s d'enregistrement.
  cleanupTimer = setTimeout(() => {
    void cleanupActivePlayback();
  }, 120_000);
}
