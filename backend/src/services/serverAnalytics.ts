import { logger } from '../utils/logger';
import { recordAnalyticsEvent } from './analyticsStore';

/**
 * Événements purement serveur : l'identifiant reste pseudonyme et les
 * propriétés doivent toujours être des métriques, jamais du texte ou de l'audio.
 */
export async function captureServerAnalytics(
  event: string,
  installationId: string,
  properties: Record<string, string | number | boolean | null | undefined>,
  timestamp?: string,
): Promise<void> {
  try {
    await recordAnalyticsEvent(event, installationId, properties, timestamp);
  } catch (error) {
    // Le suivi ne doit jamais ralentir ni empêcher une traduction réussie.
    logger.warn(`Événement Nevi Pulse ${event} non enregistré : ${error instanceof Error ? error.message : String(error)}`);
  }
}
