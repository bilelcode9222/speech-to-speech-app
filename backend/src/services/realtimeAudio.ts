import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { StageError } from '../types';
import { assertSpeechAudio, SPEECH_SAMPLE_RATE } from './speechDetection';

export const REALTIME_SAMPLE_RATE = 24_000;
export const PCM_BYTES_PER_SECOND = REALTIME_SAMPLE_RATE * 2;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
// Une seconde de tolérance pour la fin d'enregistrement du client (limité à 60 s).
const MAX_SOURCE_SECONDS = 61;
const DEMUXERS: Record<string, string> = {
  m4a: 'mov', mp4: 'mov', mp3: 'mp3', wav: 'wav', webm: 'matroska', ogg: 'ogg', flac: 'flac',
};

/** Convertit le M4A/mobile en PCM16 mono 24 kHz exigé par l'API Translation. */
export async function decodeRealtimeAudio(audioBase64: string, format: string, signal?: AbortSignal): Promise<Buffer> {
  signal?.throwIfAborted();
  const demuxer = DEMUXERS[format.toLowerCase()];
  if (!demuxer) throw new StageError('stt', 'Format audio non supporté.');
  const source = Buffer.from(audioBase64, 'base64');
  if (!source.length || source.length > MAX_SOURCE_BYTES) {
    throw new StageError('stt', 'Enregistrement vide ou trop volumineux.');
  }
  const executable = ffmpegPath;
  if (!executable) throw new StageError('stt', 'FFmpeg indisponible sur ce serveur.');

  const directory = await mkdtemp(path.join(tmpdir(), 'nevi-audio-'));
  try {
    const input = path.join(directory, 'input');
    const speechInput = path.join(directory, 'speech.pcm');
    await writeFile(input, source, { mode: 0o600, signal });
    const pcm = await new Promise<Buffer>((resolve, reject) => {
      execFile(executable, [
        '-nostdin', '-hide_banner', '-loglevel', 'error',
        // Un fichier envoyé ne doit pas être interprété comme une playlist
        // susceptible de référencer d'autres fichiers du serveur.
        '-protocol_whitelist', 'file,pipe', '-f', demuxer, '-i', input,
        '-map', '0:a:0', '-vn', '-sn', '-dn',
        '-t', String(MAX_SOURCE_SECONDS + 1),
        '-ac', '1', '-ar', String(REALTIME_SAMPLE_RATE),
        '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1',
        // A second bounded output uses FFmpeg's resampler for the voice detector.
        '-map', '0:a:0', '-vn', '-sn', '-dn',
        '-t', String(MAX_SOURCE_SECONDS + 1),
        '-ac', '1', '-ar', String(SPEECH_SAMPLE_RATE),
        '-c:a', 'pcm_s16le', '-f', 's16le', speechInput,
      ], {
        encoding: 'buffer', timeout: 10_000,
        maxBuffer: PCM_BYTES_PER_SECOND * (MAX_SOURCE_SECONDS + 2),
        signal,
      }, (error, stdout) => {
        if (error) reject(new StageError('stt', 'Conversion audio impossible ou interrompue.'));
        else resolve(stdout);
      });
    });
    if (!pcm.length) throw new StageError('stt', "L'audio reçu est vide.");
    if (pcm.length > MAX_SOURCE_SECONDS * PCM_BYTES_PER_SECOND) {
      throw new StageError('stt', 'Enregistrement trop long (60 secondes maximum).');
    }
    assertAudibleAudio(pcm);
    await assertSpeechAudio(await readFile(speechInput, { signal }), signal);
    return pcm;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Rejette le silence quasi numérique, sans prétendre identifier la parole.
 * Un seuil très bas (-60 dBFS) préserve les voix faibles. On demande 100 ms
 * d'énergie cumulée pour qu'un clic isolé ne parte pas au modèle.
 */
export function assertAudibleAudio(pcm: Buffer): void {
  const frameSamples = REALTIME_SAMPLE_RATE / 50; // 20 ms
  let audibleSamples = 0;
  for (let offset = 0; offset + 1 < pcm.length; offset += frameSamples * 2) {
    const count = Math.min(frameSamples, Math.floor((pcm.length - offset) / 2));
    let sum = 0;
    let squares = 0;
    for (let index = 0; index < count; index++) {
      const value = pcm.readInt16LE(offset + index * 2);
      sum += value;
      squares += value * value;
    }
    // Retirer la composante continue : un offset du micro n'est pas du son.
    const variance = squares / count - (sum / count) ** 2;
    if (variance > (32768 * 0.001) ** 2) audibleSamples += count;
    if (audibleSamples >= REALTIME_SAMPLE_RATE / 10) return;
  }
  throw new StageError('stt', 'Aucune parole détectée dans l’enregistrement.', 'NO_SPEECH');
}

/** Conteneur WAV compatible avec le lecteur mobile déjà distribué. */
export function pcmToWav(pcm: Buffer, sampleRate = REALTIME_SAMPLE_RATE, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
