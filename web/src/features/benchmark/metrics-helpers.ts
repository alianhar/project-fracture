import type { ModelId, ModelMetrics } from '@/lib/api/types';
import { MODEL_LABELS } from '@/lib/constants';
import { ciNonOverlapping } from '@/lib/format';

/** Model dengan titik akurasi tertinggi. */
export function bestModelByAccuracy(models: ModelMetrics[]): ModelMetrics {
  return models.reduce((best, m) => (m.accuracy.point > best.accuracy.point ? m : best), models[0]);
}

export function findModel(models: ModelMetrics[], id: ModelId): ModelMetrics | undefined {
  return models.find((m) => m.model_id === id);
}

/**
 * Aturan spec §7/§14: klaim "A lebih baik dari B" hanya sah kalau 95% CI
 * accuracy keduanya tidak overlap. Dipakai untuk anotasi kecil di UI, bukan
 * pernyataan pasti.
 */
export function accuracyClaimLabel(a: ModelMetrics, b: ModelMetrics): string {
  const aLabel = MODEL_LABELS[a.model_id];
  const bLabel = MODEL_LABELS[b.model_id];
  if (!ciNonOverlapping(a.accuracy, b.accuracy)) {
    return `${aLabel} vs ${bLabel}: CI 95% overlap — perbedaan tidak signifikan.`;
  }
  const winner = a.accuracy.point > b.accuracy.point ? aLabel : bLabel;
  return `${winner} signifikan lebih akurat (CI 95% tidak overlap).`;
}
