import {
  AudioContext,
  AudioManager,
  AudioRecorder,
  AudioBuffer,
} from 'react-native-audio-api';

/**
 * Couche audio du mode instantané.
 *
 * Deux flux tournent en parallèle :
 *  - la capture pousse des paquets PCM 16 kHz vers le serveur pendant qu'on parle
 *  - la lecture enchaîne les fragments PCM 24 kHz qui reviennent de Gemini
 *
 * expo-audio ne sait faire ni l'un ni l'autre : son lecteur ouvre des fichiers,
 * il ne peut pas enchaîner des dizaines de fragments par seconde. D'où cette
 * bibliothèque native.
 */

export const LIVE_FORMAT = {
  /** Gemini Live attend du 16 kHz en entrée */
  inputSampleRate: 16000,
  /** et renvoie du 24 kHz en sortie */
  outputSampleRate: 24000,
  /** Taille des paquets envoyés. 100 ms : assez court pour la réactivité,
   *  assez long pour ne pas saturer le réseau. */
  bufferSizeMs: 100,
} as const;

/* --------------------------------------------------------------------- */
/* Capture                                                                */
/* --------------------------------------------------------------------- */

let recorder: AudioRecorder | null = null;

/**
 * Démarre la capture. Le callback reçoit des paquets PCM 16 bits en base64,
 * prêts à être envoyés tels quels au serveur.
 */
export async function startCapture(
  onChunk: (pcmBase64: string) => void
): Promise<void> {
  await AudioManager.requestRecordingPermissions();

  AudioManager.setAudioSessionOptions({
    iosCategory: 'playAndRecord',
    iosMode: 'voiceChat',
    iosOptions: ['allowBluetooth', 'defaultToSpeaker'],
  });

  recorder = new AudioRecorder({
    sampleRate: LIVE_FORMAT.inputSampleRate,
    bufferLengthInSamples:
      (LIVE_FORMAT.inputSampleRate * LIVE_FORMAT.bufferSizeMs) / 1000,
  });

  recorder.onAudioReady(({ buffer }) => {
    const frames = buffer.getChannelData(0);
    onChunk(floatsToPcmBase64(frames));
  });

  recorder.start();
}

export function stopCapture(): void {
  try {
    recorder?.stop();
  } catch {
    // déjà arrêté
  }
  recorder = null;
}

/* --------------------------------------------------------------------- */
/* Lecture en flux                                                        */
/* --------------------------------------------------------------------- */

let context: AudioContext | null = null;
/** Instant auquel le prochain fragment doit démarrer, en secondes */
let nextStartTime = 0;

/**
 * Joue un fragment PCM dès son arrivée.
 *
 * Le point délicat : chaque fragment est programmé à la suite exacte du
 * précédent. Sans cela, les fragments se chevauchent ou laissent des blancs,
 * et la voix devient hachée.
 */
export function playChunk(pcmBase64: string): void {
  if (!context) {
    context = new AudioContext({ sampleRate: LIVE_FORMAT.outputSampleRate });
    nextStartTime = context.currentTime;
  }

  const frames = pcmBase64ToFloats(pcmBase64);
  if (frames.length === 0) return;

  const buffer: AudioBuffer = context.createBuffer(
    1,
    frames.length,
    LIVE_FORMAT.outputSampleRate
  );
  buffer.copyToChannel(frames, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);

  // Petite marge : si le réseau a pris du retard, on repart de maintenant
  // plutôt que de programmer dans le passé (le fragment serait perdu).
  const startAt = Math.max(nextStartTime, context.currentTime + 0.02);
  source.start(startAt);

  nextStartTime = startAt + buffer.duration;
}

/** Coupe la lecture en cours, par exemple si l'utilisateur reprend la parole */
export function stopPlayback(): void {
  try {
    context?.close();
  } catch {
    // déjà fermé
  }
  context = null;
  nextStartTime = 0;
}

/* --------------------------------------------------------------------- */
/* Conversions                                                            */
/* --------------------------------------------------------------------- */

/** Échantillons flottants (-1 à 1) vers PCM 16 bits base64 */
function floatsToPcmBase64(frames: Float32Array): string {
  const bytes = new Uint8Array(frames.length * 2);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < frames.length; i++) {
    // Bornage avant conversion : au-delà de 1, le son sature et grésille
    const v = Math.max(-1, Math.min(1, frames[i]));
    view.setInt16(i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }

  return encodeBase64(bytes);
}

/** PCM 16 bits base64 vers échantillons flottants */
function pcmBase64ToFloats(base64: string): Float32Array {
  const bytes = decodeBase64(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.floor(bytes.length / 2);
  const frames = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    frames[i] = view.getInt16(i * 2, true) / 0x8000;
  }

  return frames;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }

  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }

  return out;
}

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) |
      (B64.indexOf(clean[i + 3]) & 63);

    if (byteIndex < length) bytes[byteIndex++] = (n >> 16) & 255;
    if (byteIndex < length) bytes[byteIndex++] = (n >> 8) & 255;
    if (byteIndex < length) bytes[byteIndex++] = n & 255;
  }

  return bytes;
}
