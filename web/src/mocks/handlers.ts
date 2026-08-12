import { http, HttpResponse } from 'msw';
import type { ExplainResponse, ModelId, PredictBatchResponse } from '@/lib/api/types';
import { DEFAULT_THRESHOLD } from '@/lib/constants';
import { modelsFixture } from './fixtures/models';
import { getHealthFixture } from './fixtures/health';
import { metricsFixture } from './fixtures/metrics';
import { buildPredictFixture } from './fixtures/predict';
import { buildExplainFixtureBase64 } from './fixtures/explain';
import { buildCompareFixture } from './fixtures/compare';

const BASE = import.meta.env.VITE_API_BASE_URL || '';

export const handlers = [
  http.get(`${BASE}/health`, () => HttpResponse.json(getHealthFixture())),

  http.get(`${BASE}/models`, () => HttpResponse.json(modelsFixture)),

  http.get(`${BASE}/metrics`, () => HttpResponse.json(metricsFixture)),

  http.post(`${BASE}/predict`, async ({ request }) => {
    const form = await request.formData();
    const image = form.get('image');
    const modelId = form.get('model_id') as ModelId | null;
    const thresholdRaw = form.get('threshold');
    if (!(image instanceof File) || !modelId) {
      return HttpResponse.json({ detail: 'image dan model_id wajib diisi' }, { status: 400 });
    }
    const threshold = thresholdRaw ? Number(thresholdRaw) : DEFAULT_THRESHOLD;
    return HttpResponse.json(buildPredictFixture(image, modelId, threshold));
  }),

  http.post(`${BASE}/explain`, async ({ request }) => {
    const form = await request.formData();
    const image = form.get('image');
    const modelId = form.get('model_id') as ModelId | null;
    if (!(image instanceof File) || !modelId) {
      return HttpResponse.json({ detail: 'image dan model_id wajib diisi' }, { status: 400 });
    }
    const predict = buildPredictFixture(image, modelId);
    const heatmap = buildExplainFixtureBase64(image, modelId, predict.calibrated_probability);
    const response: ExplainResponse = {
      model_id: modelId,
      heatmap_png_base64: heatmap,
      probability: predict.calibrated_probability,
      latency_ms: Math.round(predict.latency_ms * 1.4),
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE}/predict/batch`, async ({ request }) => {
    const form = await request.formData();
    const images = form.getAll('images').filter((f): f is File => f instanceof File);
    const modelId = form.get('model_id') as ModelId | null;
    const thresholdRaw = form.get('threshold');
    if (images.length === 0 || !modelId) {
      return HttpResponse.json({ detail: 'images dan model_id wajib diisi' }, { status: 400 });
    }
    const threshold = thresholdRaw ? Number(thresholdRaw) : DEFAULT_THRESHOLD;
    const response: PredictBatchResponse = {
      results: images.map((img) => ({ ...buildPredictFixture(img, modelId, threshold), filename: img.name })),
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE}/compare`, async ({ request }) => {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) {
      return HttpResponse.json({ detail: 'image wajib diisi' }, { status: 400 });
    }
    return HttpResponse.json({ results: buildCompareFixture(image) });
  }),
];
