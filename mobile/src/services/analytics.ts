import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../constants/config';

/**
 * Client PostHog partagé.
 *
 * L'app n'a pas de librairie de navigation, donc l'autocapture d'écran
 * n'a rien à observer. On envoie les vues `$screen` à la main depuis
 * chaque état d'affichage.
 */
export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
});
