import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { canBeTarget } from '../constants/languages';
import { Exchange } from '../types';
import { ThemeName } from '../theme/tokens';

interface AppState {
  sourceLanguage: string;
  targetLanguage: string;
  lastManualSourceLanguage: string;
  exchanges: Exchange[];
  isConnected: boolean;
  themePreference: ThemeName | 'system';
  setSourceLanguage: (code: string) => void;
  setTargetLanguage: (code: string) => void;
  swapLanguages: () => void;
  setConnected: (value: boolean) => void;
  setThemePreference: (value: ThemeName | 'system') => void;
  addExchange: (exchange: Exchange) => void;
  updateExchange: (id: string, patch: Partial<Exchange>) => void;
  clearExchanges: () => void;
}

function defaultTargetLanguage(): string {
  const phoneLanguage = getLocales()[0]?.languageCode?.toLowerCase();

  // canBeTarget et non LANGUAGES : un téléphone en bengali ou en géorgien
  // démarrerait sinon sur une cible que la voix ne sait pas prononcer.
  if (phoneLanguage && canBeTarget(phoneLanguage)) {
    return phoneLanguage;
  }

  return 'en';
}

function fallbackManualSource(targetLanguage: string): string {
  return targetLanguage !== 'en' ? 'en' : 'fr';
}

/**
 * Garantit une cible valide.
 *
 * La source accepte les 100 langues, la cible seulement les 57 dotées
 * d'une voix. Sans ce garde-fou, échanger les langues depuis une source
 * comme le bengali produirait une cible muette.
 */
function safeTarget(candidate: string, avoid: string): string {
  if (candidate !== avoid && canBeTarget(candidate)) {
    return candidate;
  }

  return fallbackManualSource(avoid);
}

const initialTargetLanguage = defaultTargetLanguage();
const initialManualSourceLanguage =
  fallbackManualSource(initialTargetLanguage);

export const useAppStore = create<AppState>((set) => ({
  sourceLanguage: 'auto',
  targetLanguage: initialTargetLanguage,
  lastManualSourceLanguage: initialManualSourceLanguage,
  exchanges: [],
  isConnected: false,
  themePreference: 'light',

  setSourceLanguage: (code) =>
    set((state) => {
      if (code === 'auto') {
        return { sourceLanguage: 'auto' };
      }

      if (state.targetLanguage === code) {
        const newTarget =
          state.sourceLanguage !== 'auto'
            ? state.sourceLanguage
            : state.lastManualSourceLanguage !== code
              ? state.lastManualSourceLanguage
              : fallbackManualSource(code);

        return {
          sourceLanguage: code,
          targetLanguage: safeTarget(newTarget, code),
          lastManualSourceLanguage: code,
        };
      }

      return {
        sourceLanguage: code,
        lastManualSourceLanguage: code,
      };
    }),

  setTargetLanguage: (code) =>
    set((state) => {
      if (code === 'auto' || !canBeTarget(code)) {
        return {};
      }

      if (state.sourceLanguage === code) {
        const newSource =
          state.targetLanguage !== code
            ? state.targetLanguage
            : state.lastManualSourceLanguage !== code
              ? state.lastManualSourceLanguage
              : fallbackManualSource(code);

        return {
          targetLanguage: code,
          sourceLanguage: newSource,
          lastManualSourceLanguage: newSource,
        };
      }

      return { targetLanguage: code };
    }),

  swapLanguages: () =>
    set((state) => {
      if (state.sourceLanguage === 'auto') {
        const nextTarget =
          state.lastManualSourceLanguage !== state.targetLanguage
            ? state.lastManualSourceLanguage
            : fallbackManualSource(state.targetLanguage);

        return {
          sourceLanguage: state.targetLanguage,
          targetLanguage: safeTarget(nextTarget, state.targetLanguage),
          lastManualSourceLanguage: state.targetLanguage,
        };
      }

      // La source ne peut pas devenir cible : on laisse tout en place
      // plutôt que de basculer sur une langue muette.
      if (!canBeTarget(state.sourceLanguage)) {
        return {};
      }

      return {
        sourceLanguage: state.targetLanguage,
        targetLanguage: state.sourceLanguage,
        lastManualSourceLanguage: state.targetLanguage,
      };
    }),

  setConnected: (value) => set({ isConnected: value }),
  setThemePreference: (value) => set({ themePreference: value }),

  addExchange: (exchange) =>
    set((state) => ({
      exchanges: [exchange, ...state.exchanges],
    })),

  updateExchange: (id, patch) =>
    set((state) => ({
      exchanges: state.exchanges.map((exchange) =>
        exchange.id === id ? { ...exchange, ...patch } : exchange,
      ),
    })),

  clearExchanges: () => set({ exchanges: [] }),
}));
