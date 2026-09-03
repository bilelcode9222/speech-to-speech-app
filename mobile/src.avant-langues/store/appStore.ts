import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { LANGUAGES } from '../constants/languages';
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

  if (
    phoneLanguage &&
    LANGUAGES.some((language) => language.code === phoneLanguage)
  ) {
    return phoneLanguage;
  }

  return 'en';
}

function fallbackManualSource(targetLanguage: string): string {
  return targetLanguage !== 'en' ? 'en' : 'fr';
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
          targetLanguage: newTarget,
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
      if (code === 'auto') {
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
          targetLanguage: nextTarget,
          lastManualSourceLanguage: state.targetLanguage,
        };
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
