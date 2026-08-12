import { useMediaQuery } from './use-media-query';

/** true kalau user meminta animasi minimal (OS/browser setting). */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
