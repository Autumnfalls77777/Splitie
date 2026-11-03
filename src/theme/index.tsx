import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { useSettingsStore, type ThemeMode } from '@/features/settings/settings.store';
import { setDisplayCurrency } from '@/lib/currency';
import {
  darkColors,
  durations,
  fonts,
  lightColors,
  palette,
  radius,
  shadows as baseShadows,
  spacing,
  typography,
  type ThemeColors,
} from './tokens';

export type AppTheme = {
  isDark: boolean;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  palette: typeof palette;
  durations: typeof durations;
  shadows: {
    card: object;
    float: object;
    hero: object;
  };
};

const ThemeContext = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSettingsStore((s) => s.themeMode);
  const setMode = useSettingsStore((s) => s.setThemeMode);
  const currency = useSettingsStore((s) => s.currency);
  const systemScheme = useColorScheme();

  useEffect(() => {
    setDisplayCurrency(currency);
  }, [currency]);

  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    try {
      Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
    } catch {
      // Appearance.setColorScheme is not implemented on every platform.
    }
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [mode, colors.bg]);

  const theme = useMemo<AppTheme>(() => {
    const shadowColor = colors.shadow;
    return {
      isDark,
      scheme,
      mode,
      setMode,
      colors,
      typography,
      spacing,
      radius,
      fonts,
      palette,
      durations,
      shadows: {
        card: {
          ...baseShadows.card,
          shadowColor,
          shadowOpacity: isDark ? 0.32 : 0.05,
        },
        float: {
          ...baseShadows.float,
          shadowColor,
          shadowOpacity: isDark ? 0.45 : 0.14,
        },
        hero: {
          ...baseShadows.hero,
          shadowColor: isDark ? '#000000' : '#6F8F20',
          shadowOpacity: isDark ? 0.5 : 0.22,
        },
      },
    };
  }, [colors, isDark, mode, scheme, setMode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
