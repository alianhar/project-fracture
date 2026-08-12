import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '@/theme/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ganti ke mode printout (terang)' : 'Ganti ke mode lightbox (gelap)'}
      title={isDark ? 'Mode printout' : 'Mode lightbox'}
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
    >
      <Sun
        size={16}
        weight="regular"
        className={cn(
          'absolute',
          !reducedMotion && 'transition-all duration-200',
          isDark ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
        )}
      />
      <Moon
        size={16}
        weight="regular"
        className={cn(
          'absolute',
          !reducedMotion && 'transition-all duration-200',
          isDark ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
        )}
      />
    </button>
  );
}
