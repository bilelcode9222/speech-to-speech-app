import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

let counter = 0;

/**
 * Écrit le MP3 reçu (base64) dans un fichier temporaire, puis le joue.
 * expo-audio ne sait pas lire directement du base64 : le passage par un
 * fichier est obligatoire.
 */
export async function playBase64Audio(audioBase64: string): Promise<void> {
  const path = `${FileSystem.cacheDirectory}traduction-${counter++}.mp3`;

  await FileSystem.writeAsStringAsync(path, audioBase64, { encoding: 'base64' });

  // Sur iOS, il faut couper le mode enregistrement pour que le haut-parleur
  // reprenne un volume normal.
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri: path });
  player.play();

  // Libère la mémoire une fois la lecture probablement terminée
  setTimeout(() => {
    try {
      player.remove();
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    } catch {
      // lecteur déjà libéré
    }
  }, 60_000);
}
