import WebSocket from 'ws';
import { config } from '../config/env';
import { StageError } from '../types';
import { REALTIME_SAMPLE_RATE, PCM_BYTES_PER_SECOND, pcmToWav } from './realtimeAudio';

const FRAME_BYTES = PCM_BYTES_PER_SECOND / 5; // 200 ms, recommandé par OpenAI.
const MAX_OUTPUT_BYTES = PCM_BYTES_PER_SECOND * 120;
const MAX_TRANSCRIPT_LENGTH = 32_000;

export interface RealtimeTranslationResult {
  originalText: string;
  translatedText: string;
  audioBase64: string;
}

/**
 * Adaptateur pour les enregistrements du mobile existant. La session OpenAI
 * reçoit du PCM par trames et retourne directement la traduction ET sa voix.
 * Ne jamais appeler response.create ou fermer avant session.closed : la fin
 * de la traduction peut arriver après session.close.
 */
export function translateRealtimePcm(
  pcm: Buffer,
  targetLanguage: string,
  signal?: AbortSignal,
): Promise<RealtimeTranslationResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StageError('translation', 'Traduction interrompue.'));
      return;
    }
    const ws = new WebSocket(
      `wss://api.openai.com/v1/realtime/translations?model=${encodeURIComponent(config.realtimeTranslation.model)}`,
      {
        headers: { Authorization: `Bearer ${config.openai.apiKey}` },
        handshakeTimeout: 10_000,
        maxPayload: 2 * 1024 * 1024,
      },
    );
    let settled = false;
    let configured = false;
    let inputEnded = false;
    let translationClosed = false;
    let originalText = '';
    let translatedText = '';
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let sampleRate = REALTIME_SAMPLE_RATE;
    let channels = 1;

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      // terminate libère aussi une connexion encore en phase de handshake.
      // Le listener error reste en place pour absorber les erreurs de fermeture.
      if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
    };
    const fail = (message: string, code?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new StageError('translation', message, code));
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        originalText: originalText.trim(), translatedText: translatedText.trim(),
        audioBase64: pcmToWav(Buffer.concat(chunks), sampleRate, channels).toString('base64'),
      });
    };
    const onAbort = () => fail('Traduction interrompue.');
    const timer = setTimeout(() => {
      if (translationClosed) finish();
      else fail('Délai OpenAI Realtime Translation dépassé.');
    }, config.realtimeTranslation.timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });

    const send = (event: object): Promise<void> => new Promise((sent, failed) => {
      if (settled) { failed(new Error('Session terminée.')); return; }
      ws.send(JSON.stringify(event), (error) => error ? failed(error) : sent());
    });
    const appendRecording = async () => {
      try {
        for (let offset = 0; offset < pcm.length; offset += FRAME_BYTES) {
          await send({
            type: 'session.input_audio_buffer.append',
            audio: pcm.subarray(offset, offset + FRAME_BYTES).toString('base64'),
          });
        }
        inputEnded = true;
        await send({ type: 'session.close' });
      } catch {
        fail('Envoi audio OpenAI Realtime Translation impossible.');
      }
    };

    ws.on('open', () => {
      void send({
        type: 'session.update',
        session: {
          audio: {
            input: { transcription: { model: config.realtimeTranslation.transcriptionModel } },
            output: { language: targetLanguage },
          },
        },
      }).catch(() => fail('Configuration OpenAI Realtime Translation impossible.'));
    });

    ws.on('message', (raw) => {
      if (settled) return;
      try {
        const event = JSON.parse(raw.toString());
        switch (event.type) {
          case 'session.updated':
            if (configured) break;
            if (event.session?.audio?.output?.language !== targetLanguage) {
              fail('Langue cible non confirmée par OpenAI Realtime Translation.');
              break;
            }
            configured = true;
            void appendRecording();
            break;
          case 'session.input_transcript.delta':
          case 'session.output_transcript.delta':
            if (typeof event.delta !== 'string') throw new Error('Invalid transcript');
            if (event.type === 'session.input_transcript.delta') originalText += event.delta;
            else translatedText += event.delta;
            if (originalText.length > MAX_TRANSCRIPT_LENGTH || translatedText.length > MAX_TRANSCRIPT_LENGTH) {
              fail('Transcription OpenAI Realtime Translation trop longue.');
            }
            break;
          case 'session.output_audio.delta': {
            const rate = event.sample_rate ?? sampleRate;
            const count = event.channels ?? channels;
            if ((event.format && event.format !== 'pcm16') ||
                !Number.isInteger(rate) || rate < 8_000 || rate > 48_000 ||
                (count !== 1 && count !== 2) ||
                (outputBytes > 0 && (rate !== sampleRate || count !== channels)) ||
                typeof event.delta !== 'string') throw new Error('Invalid audio format');
            sampleRate = rate;
            channels = count;
            const chunk = Buffer.from(event.delta, 'base64');
            if (chunk.length % (channels * 2) !== 0) throw new Error('Invalid PCM');
            outputBytes += chunk.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
              fail('Audio OpenAI Realtime Translation trop volumineux.');
              break;
            }
            chunks.push(chunk);
            break;
          }
          case 'session.closed':
            if (!configured || !inputEnded) { fail('Session OpenAI fermée avant envoi complet.'); break; }
            if (!translatedText.trim() || !outputBytes) {
              fail('OpenAI Realtime Translation a renvoyé une traduction vide ou sans voix.', 'REALTIME_EMPTY_RESULT');
              break;
            }
            // OpenAI peut encore livrer des deltas de transcription source
            // après session.closed. La fermeture WebSocket normale les draine ;
            // terminate() les perdait et laissait la bulle source vide.
            translationClosed = true;
            ws.close();
            break;
          case 'error':
            // Ne pas conserver le payload fournisseur, qui peut contenir de l'audio.
            fail('Requête OpenAI Realtime Translation refusée. Vérifie l’accès au modèle et les langues.');
            break;
        }
      } catch {
        fail('Réponse OpenAI Realtime Translation invalide.');
      }
    });
    ws.on('error', () => fail('Connexion OpenAI Realtime Translation impossible.'));
    ws.on('close', () => {
      if (translationClosed) finish();
      else fail('Connexion OpenAI interrompue avant la fin de la traduction.');
    });
  });
}
