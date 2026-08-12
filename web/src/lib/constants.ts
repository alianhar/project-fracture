import type { ModelId } from './api/types';

export const MODEL_IDS: ModelId[] = ['tiny', 'small', 'base', 'large'];

export const MODEL_LABELS: Record<ModelId, string> = {
  tiny: 'ConvNeXt-Tiny',
  small: 'ConvNeXt-Small',
  base: 'ConvNeXt-Base',
  large: 'ConvNeXt-Large',
};

export const DEFAULT_THRESHOLD = 0.5;

/** Warna identitas per model di chart Benchmark — SENGAJA terpisah dari
 * --color-positive/--color-negative supaya identitas model tidak tabrakan
 * dengan semantik keputusan (fractured/not_fractured). */
export const MODEL_CHART_COLORS: Record<ModelId, string> = {
  tiny: '#5B7A85',
  small: '#8FA8AE',
  base: '#B8CDD1',
  large: '#DCEEF2',
};

export const ROUTES = {
  analyze: '/',
  compare: '/compare',
  benchmark: '/benchmark',
  methodology: '/methodology',
  history: '/history',
} as const;
