import type { Decision, ModelId, PredictResponse } from '@/lib/api/types';
import { DEFAULT_THRESHOLD } from '@/lib/constants';

/** Hash string sederhana (djb2) — dipakai men-seed pseudo-random dari nama+ukuran
 * file, supaya upload file yang sama hasilnya konsisten dalam satu sesi,
 * file berbeda hasilnya bervariasi (bukan angka statis/acak murni). */
function hashSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const MODEL_LATENCY_BASE_MS: Record<ModelId, number> = {
  tiny: 45,
  small: 80,
  base: 140,
  large: 260,
};

export function buildPredictFixture(file: File, modelId: ModelId, threshold = DEFAULT_THRESHOLD): PredictResponse {
  const seed = hashSeed(`${file.name}:${file.size}:${modelId}`);
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);

  // Bias ke arah "fractured" atau "not_fractured" tergantung hash, supaya
  // demo tidak selalu menunjukkan hasil yang sama.
  const leansFractured = r1 > 0.45;
  const rawProbability = leansFractured
    ? Number((0.62 + r2 * 0.36).toFixed(4))
    : Number((0.02 + r2 * 0.3).toFixed(4));

  // Kalibrasi menarik probabilitas mentah sedikit ke arah 0.5 (temperature
  // scaling khas mengurangi overconfidence).
  const calibratedProbability = Number((0.5 + (rawProbability - 0.5) * 0.86).toFixed(4));

  const decision: Decision =
    Math.abs(calibratedProbability - threshold) < 0.04
      ? 'abstain'
      : calibratedProbability >= threshold
        ? 'fractured'
        : 'not_fractured';

  const isOod = r1 > 0.985; // sangat jarang, untuk menguji gerbang OOD di UI

  return {
    model_id: modelId,
    label: decision,
    raw_probability: rawProbability,
    calibrated_probability: calibratedProbability,
    threshold,
    decision,
    latency_ms: Math.round(MODEL_LATENCY_BASE_MS[modelId] * (0.85 + r2 * 0.3)),
    is_ood: isOod,
  };
}
