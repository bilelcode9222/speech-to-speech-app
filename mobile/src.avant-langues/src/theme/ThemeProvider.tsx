import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Palette, palettes, ThemeName } from './tokens';
import { useAppStore } from '../store/appStore';

interface ThemeValue {
  name: ThemeName;
  colors: Palette;
  /** 'system' suit les réglages de l'iPhone */
  preference: ThemeName | 'system';
  setPreference: (value: ThemeName | 'system') => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useAppStore((s) => s.themePreference);
  const setPreference = useAppStore((s) => s.setThemePreference);

  const name: ThemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      name,
      colors: palettes[name],
      preference,
      setPreference,
      toggle: () => setPreference(name === 'dark' ? 'light' : 'dark'),
    }),
    [name, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé à l\'intérieur de ThemeProvider');
  }
  return context;
}
