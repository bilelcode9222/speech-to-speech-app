import WebSocket from 'ws';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { languageName } from '../utils/languages';

const LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/' +
  'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export interface LiveSessionHooks {
  /** Fragment de traduction écrite, au fil de la parole */
  onText: (text: string) => void;
  /** Fragment audio PCM 24 kHz, à jouer dès réception */
  onAudio: (pcmBase64: string) => void;
  /** Le modèle considère le tour terminé */
  onTurnComplete: () => void;
  onError: (message: string) => void;
}

/**
 * Session Gemini Live, en audio ET texte.
 *
 * L'audio circule en continu dans les deux sens : on pousse le micro pendant
 * que l'utilisateur parle, et la voix traduite revient par fragments avant
 * même qu'il ait fini sa phrase. Le texte arrive en parallèle pour l'écran.
 *
 * C'est ce chevauchement qui supprime l'attente : contrairement au tour par
 * tour, rien n'est mis en file, tout se passe pendant.
 */
export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private ready = false;
  private pending: string[] = [];

  constructor(
    private sourceLanguage: string,
    private targetLanguage: string,
    private hooks: LiveSessionHooks
  ) {}

  connect(): void {
    this.ws = new WebSocket(`${LIVE_URL}?key=${config.gemini.apiKey}`);

    this.ws.on('open', () => this.sendSetup());
    this.ws.on('message', (raw) => this.handleMessage(raw));

    this.ws.on('error', (error) => {
      logger.error('Gemini Live : erreur', error);
      this.hooks.onError(`Connexion Gemini Live impossible : ${error.message}`);
    });

    this.ws.on('close', (code) => {
      this.ready = false;
      if (code !== 1000) logger.warn(`Gemini Live fermé (code ${code})`);
    });
  }

  private sendSetup(): void {
    const source = languageName(this.sourceLanguage);
    const target = languageName(this.targetLanguage);

    this.ws?.send(
      JSON.stringify({
        setup: {
          model: `models/${config.gemini.liveModel}`,
          generationConfig: {
            // Audio ET texte : la voix pour l'oreille, le texte pour l'écran
            responseModalities: ['AUDIO', 'TEXT'],
            temperature: 0.2,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: config.gemini.voice },
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text:
                  `Tu es un interprète simultané. Tu entends du ${source} et tu ` +
                  `restitues en ${target}.\n` +
                  `Règles absolues :\n` +
                  `- Tu ne produis QUE la traduction. Jamais de commentaire, ` +
                  `jamais de réponse à ce qui est dit, jamais de question.\n` +
                  `- Ne salue pas, ne t'excuse pas, ne demande aucune précision.\n` +
                  `- Commence à traduire dès que le sens d'un segment est clair, ` +
                  `sans attendre la fin de la phrase.\n` +
                  `- Conserve le ton et le registre d'origine.\n` +
                  `- Si tu n'entends rien d'intelligible, reste silencieux.`,
              },
            ],
          },
          // Le modèle détecte lui-même les silences et enchaîne
          realtimeInputConfig: {
            automaticActivityDetection: { disabled: false },
          },
        },
      })
    );
  }

  /** Pousse un paquet audio PCM 16 kHz base64 */
  sendAudio(pcmBase64: string): void {
    if (!this.ready) {
      // Les premiers paquets arrivent avant la confirmation du setup :
      // on les garde plutôt que de perdre le début de la phrase.
      this.pending.push(pcmBase64);
      return;
    }
    this.push(pcmBase64);
  }

  private push(pcmBase64: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: pcmBase64 }],
        },
      })
    );
  }

  finishTurn(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  }

  close(): void {
    this.ws?.close(1000);
    this.ws = null;
    this.ready = false;
  }

  private handleMessage(raw: WebSocket.RawData): void {
    let message: any;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.setupComplete) {
      this.ready = true;
      for (const chunk of this.pending) this.push(chunk);
      this.pending = [];
      return;
    }

    const content = message.serverContent;
    if (!content) return;

    for (const part of content.modelTurn?.parts || []) {
      if (part.text) {
        this.hooks.onText(part.text);
      }
      // L'audio arrive en PCM brut, prêt à être joué tel quel
      if (part.inlineData?.data) {
        this.hooks.onAudio(part.inlineData.data);
      }
    }

    if (content.turnComplete) {
      this.hooks.onTurnComplete();
    }
  }
}
