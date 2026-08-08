import { create } from 'zustand';
import { Exchange } from '../types';
import { ThemeName } from '../theme/tokens';

interface AppState {
  sourceLanguage: string;
  targetLanguage: string;
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

export const useAppStore = create<AppState>((set) => ({
  sourceLanguage: 'fr',
  targetLanguage: 'en',
  exchanges: [],
  isConnected: false,
  // Par défaut, on suit le réglage clair/sombre de l'iPhone
  themePreference: 'system',

  setSourceLanguage: (code) =>
    set((state) => ({
      sourceLanguage: code,
      targetLanguage: state.targetLanguage === code ? state.sourceLanguage : state.targetLanguage,
    })),

  setTargetLanguage: (code) =>
    set((state) => ({
      targetLanguage: code,
      sourceLanguage: state.sourceLanguage === code ? state.targetLanguage : state.sourceLanguage,
    })),

  swapLanguages: () =>
    set((state) => ({
      sourceLanguage: state.targetLanguage,
      targetLanguage: state.sourceLanguage,
    })),

  setConnected: (value) => set({ isConnected: value }),
  setThemePreference: (value) => set({ themePreference: value }),

  addExchange: (exchange) =>
    set((state) => ({ exchanges: [exchange, ...state.exchanges] })),

  updateExchange: (id, patch) =>
    set((state) => ({
      exchanges: state.exchanges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  clearExchanges: () => set({ exchanges: [] }),
}));
