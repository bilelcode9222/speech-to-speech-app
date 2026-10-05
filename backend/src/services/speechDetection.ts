import path from 'node:path';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import { StageError } from '../types';

export const SPEECH_SAMPLE_RATE = 16_000;
const FRAME_SAMPLES = 512;
const CONTEXT_SAMPLES = 64;
const MIN_SPEECH_SAMPLES = 1536; // 96 ms: keep short answers such as “oui”.
let model: Promise<InferenceSession> | undefined;

function getModel(): Promise<InferenceSession> {
  model ??= InferenceSession.create(path.join(__dirname, '../../models/silero-vad.onnx'), {
    executionProviders: ['cpu'], intraOpNumThreads: 1, interOpNumThreads: 1,
    graphOptimizationLevel: 'all',
  }).catch(error => { model = undefined; throw error; });
  return model;
}

/** Actual voice detection, independent of the selected or detected language.
 * The model is bundled locally; recordings never leave the server for this check.
 * Recurrent state belongs to each recording, never to the shared model session.
 */
export async function assertSpeechAudio(pcm16: Buffer, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  try {
    // Very short, quiet words can otherwise stay below the model's probability
    // threshold. Normalize only its analysis copy, without changing STT audio or
    // lowering the speech threshold. Bound gain and never amplify digital silence.
    let peak = 0;
    for (let offset = 0; offset + 1 < pcm16.length; offset += 2) {
      peak = Math.max(peak, Math.abs(pcm16.readInt16LE(offset)) / 32768);
    }
    const gain = peak > 0 ? Math.min(16, Math.max(1, 0.2 / peak)) : 1;
    const session = await getModel();
    signal?.throwIfAborted();
    let state: Tensor = new Tensor('float32', new Float32Array(256), [2, 1, 128]);
    let context = new Float32Array(CONTEXT_SAMPLES);
    const sr = new Tensor('int64', BigInt64Array.from([BigInt(SPEECH_SAMPLE_RATE)]), []);
    let speechSamples = 0;
    for (let offset = 0; offset + 1 < pcm16.length; offset += FRAME_SAMPLES * 2) {
      signal?.throwIfAborted();
      const count = Math.min(FRAME_SAMPLES, Math.floor((pcm16.length - offset) / 2));
      const samples = new Float32Array(CONTEXT_SAMPLES + FRAME_SAMPLES);
      samples.set(context);
      for (let i = 0; i < count; i++) samples[CONTEXT_SAMPLES + i] = pcm16.readInt16LE(offset + i * 2) / 32768 * gain;
      const result = await session.run({ input: new Tensor('float32', samples, [1, samples.length]), state, sr });
      signal?.throwIfAborted();
      const probability = Number(result.output.data[0]);
      if (!Number.isFinite(probability)) throw new Error('Invalid voice detector result');
      state = result.stateN;
      context = samples.slice(-CONTEXT_SAMPLES);
      speechSamples = probability >= 0.5 ? speechSamples + count : 0;
      if (speechSamples >= MIN_SPEECH_SAMPLES) return;
    }
  } catch (error) {
    signal?.throwIfAborted();
    // A detector failure must not fall through to a hallucinated transcription.
    throw new StageError('stt', 'Détection de parole momentanément indisponible.');
  }
  throw new StageError('stt', 'Aucune parole détectée dans l’enregistrement.', 'NO_SPEECH');
}
