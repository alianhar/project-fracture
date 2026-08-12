import { getJson, postForm } from './client';
import type {
  CompareResponse,
  ExplainResponse,
  HealthResponse,
  ModelId,
  MetricsResponse,
  ModelsResponse,
  PredictBatchResponse,
  PredictResponse,
} from './types';

export function getHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>('/health');
}

export function getModels(): Promise<ModelsResponse> {
  return getJson<ModelsResponse>('/models');
}

export function getMetrics(): Promise<MetricsResponse> {
  return getJson<MetricsResponse>('/metrics');
}

export function postPredict(image: File, modelId: ModelId, threshold?: number): Promise<PredictResponse> {
  const form = new FormData();
  form.append('image', image);
  form.append('model_id', modelId);
  if (threshold !== undefined) form.append('threshold', String(threshold));
  return postForm<PredictResponse>('/predict', form);
}

export function postExplain(image: File, modelId: ModelId): Promise<ExplainResponse> {
  const form = new FormData();
  form.append('image', image);
  form.append('model_id', modelId);
  return postForm<ExplainResponse>('/explain', form);
}

export function postPredictBatch(
  images: File[],
  modelId: ModelId,
  threshold?: number,
): Promise<PredictBatchResponse> {
  const form = new FormData();
  images.forEach((img) => form.append('images', img));
  form.append('model_id', modelId);
  if (threshold !== undefined) form.append('threshold', String(threshold));
  return postForm<PredictBatchResponse>('/predict/batch', form);
}

export function postCompare(image: File): Promise<CompareResponse> {
  const form = new FormData();
  form.append('image', image);
  return postForm<CompareResponse>('/compare', form);
}
