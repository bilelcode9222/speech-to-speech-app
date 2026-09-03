import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

let counter = 0;

/**
 * Écrit l'audio reçu (base64) dans un fichier temporaire, puis le joue.
 *
 * L'extension compte : expo-audio choisit son décodeur d'après elle.
 * Gemini renvoie du WAV, ElevenLabs du MP3 — d'où le paramètre.
 */
export async function playBase64Audio(
  audioBase64: string,
  format: 'wav' | 'mp3' = 'mp3'
): Promise<void> {
  const path = `${FileSystem.cacheDirectory}traduction-${counter++}.${format}`;

  await FileSystem.writeAsStringAsync(path, audioBase64, { encoding: 'base64' });

  // Sur iOS, il faut couper le mode enregistrement pour que le haut-parleur
  // reprenne un volume normal.
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri: path });
  player.play();

  setTimeout(() => {
    try {
      player.remove();
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
    } catch {
      // lecteur déjà libéré
    }
  }, 60_000);
}
