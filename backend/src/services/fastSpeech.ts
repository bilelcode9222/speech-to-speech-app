import { synthesizeSpeechOpenAI } from './openaiService';
import { logger } from '../utils/logger';
import { SpeechResult, StageError } from '../types';

/** Keep the usual voice and model. Only slow/failed requests get a second attempt.
 * Both attempts share the caller's deadline; the first complete audio wins.
 */
export function synthesizeFastSpeech(
  text: string,
  model: string,
  signal: AbortSignal,
  requestId: string,
): Promise<SpeechResult> {
  signal.throwIfAborted();
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const requestSignal = AbortSignal.any([signal, controller.signal]);
    let settled = false;
    let attempts = 0;
    let failures = 0;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (hedgeTimer !== undefined) clearTimeout(hedgeTimer);
      signal.removeEventListener('abort', onAbort);
      controller.abort();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(signal.reason);
    const attempt = () => {
      if (settled || attempts >= 2) return;
      if (signal.aborted) { onAbort(); return; }
      const number = ++attempts;
      if (number === 2) {
        if (hedgeTimer !== undefined) clearTimeout(hedgeTimer);
        logger.info(`Pipeline ${requestId} : seconde tentative voix IA après ${Date.now() - started}ms`);
      }
      const failed = (error: unknown) => {
        if (settled) return;
        if (signal.aborted) { onAbort(); return; }
        failures++;
        if (attempts < 2) attempt();
        else if (failures === 2) fail(error);
      };
      void Promise.resolve().then(() => {
        requestSignal.throwIfAborted();
        return synthesizeSpeechOpenAI(text, { model, signal: requestSignal });
      }).then(speech => {
        if (settled) return;
        if (signal.aborted) { onAbort(); return; }
        if (!speech.audioBase64) {
          failed(new StageError('tts', 'Audio vocal vide.'));
          return;
        }
        settled = true;
        cleanup();
        const durationMs = Date.now() - started;
        logger.info(`Pipeline ${requestId} : voix IA prête en ${durationMs}ms (tentative ${number})`);
        resolve({ audioBase64: speech.audioBase64, durationMs });
      }, failed);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    hedgeTimer = setTimeout(attempt, 2_500);
    attempt();
  });
}
