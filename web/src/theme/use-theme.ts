import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme, toggleTheme, type Theme } from './theme-store';

export interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** Hook React tipis di atas theme-store — aman dipakai di komponen mana pun. */
export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getTheme);
  return { theme, setTheme, toggleTheme };
}
