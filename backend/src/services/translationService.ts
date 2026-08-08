import Groq from 'groq-sdk';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { StageError, TranslationResult } from '../types';
import { languageName } from '../utils/languages';

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Traduit un texte via un LLM hébergé sur Groq.
 *
 * Le prompt est volontairement strict : le modèle ne doit renvoyer QUE la
 * traduction, sans commentaire ni guillemets, sinon la voix lirait à haute
 * voix des phrases parasites du type "Voici la traduction :".
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const started = Date.now();

  const source = languageName(sourceLanguage);
  const target = languageName(targetLanguage);

  try {
    const completion = await groq.chat.completions.create({
      model: config.groq.llmModel,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content:
            `Tu es un traducteur professionnel. Traduis le message de l'utilisateur ` +
            `depuis ${source} vers ${target}.\n` +
            `Règles strictes :\n` +
            `- Réponds UNIQUEMENT avec la traduction.\n` +
            `- Aucun commentaire, aucune explication, aucun guillemet ajouté.\n` +
            `- Conserve le ton, le registre et le niveau de langue d'origine.\n` +
            `- Traduis même les phrases incomplètes ou familières.\n` +
            `- Si le texte est déjà en ${target}, renvoie-le tel quel.`,
        },
        { role: 'user', content: text },
      ],
    });

    const translatedText = (completion.choices[0]?.message?.content || '').trim();
    const durationMs = Date.now() - started;
    logger.timing('Traduction', durationMs);

    if (!translatedText) {
      throw new StageError('translation', 'Le modèle a renvoyé une traduction vide.');
    }

    return { translatedText, durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec de la traduction', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('decommissioned') || message.includes('does not exist')) {
      throw new StageError(
        'translation',
        `Le modèle "${config.groq.llmModel}" n'est plus disponible. ` +
        `Consulte console.groq.com/docs/models et mets à jour llmModel dans src/config/env.ts`
      );
    }
    throw new StageError('translation', `Erreur Groq (traduction) : ${message}`);
  }
}
