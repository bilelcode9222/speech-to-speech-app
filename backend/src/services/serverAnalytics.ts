import axios from 'axios';

import { config } from '../config/env';
import { logger } from '../utils/logger';

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
  const token = config.analyticsDashboard.posthogProjectToken;
  if (!token) return;

  const host = config.analyticsDashboard.posthogHost.replace(/\/$/, '');
  try {
    await axios.post(
      `${host}/capture/`,
      {
        api_key: token,
        event,
        properties: { distinct_id: installationId, ...properties },
        timestamp,
      },
      { timeout: 10_000 },
    );
  } catch (error) {
    // Le suivi ne doit jamais ralentir ni empêcher une traduction réussie.
    logger.warn(`Événement analytics ${event} non envoyé : ${error instanceof Error ? error.message : String(error)}`);
  }
}
