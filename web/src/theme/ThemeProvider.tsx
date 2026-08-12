import { useEffect, type ReactNode } from 'react';
import { useTheme } from './use-theme';

const THEME_COLOR: Record<'dark' | 'light', string> = {
  dark: '#0A0E13',
  light: '#F7F5F0',
};

/**
 * Menyinkronkan <meta name="theme-color"> (warna status-bar mobile) dengan
 * tema aktif. Atribut data-theme di <html> sendiri sudah di-set lebih awal
 * oleh script anti-FOUC di index.html — provider ini tidak perlu (dan tidak
 * boleh) menulis ulang itu saat mount, supaya tidak ada flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  return children;
}
