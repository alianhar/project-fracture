import type { CompareModelResult } from '@/lib/api/types';
import { MODEL_IDS } from '@/lib/constants';
import { buildPredictFixture } from './predict';
import { buildExplainFixtureBase64 } from './explain';

export function buildCompareFixture(file: File): CompareModelResult[] {
  return MODEL_IDS.map((modelId) => {
    const predict = buildPredictFixture(file, modelId);
    const heatmap = buildExplainFixtureBase64(file, modelId, predict.calibrated_probability);
    return { ...predict, heatmap_png_base64: heatmap };
  });
}
