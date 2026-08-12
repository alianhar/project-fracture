/**
 * Cermin persis kontrak API di spec §9
 * (docs/superpowers/specs/2026-08-12-fracture-classification-design.md).
 * Kalau backend asli berubah, spec §9 yang diubah dulu, lalu file ini
 * disesuaikan — bukan sebaliknya.
 */

export type ModelId = 'tiny' | 'small' | 'base' | 'large';
export type Decision = 'fractured' | 'not_fractured' | 'abstain';

// GET /health
export interface HealthResponse {
  status: 'cold' | 'warming' | 'ready';
  uptime_s: number | null;
  eta_s: number | null;
}

// GET /models
export interface ModelInfo {
  id: ModelId;
  label: string;
  params_millions: number;
  input_size: number;
  onnx_size_mb: number;
  description: string;
}
export type ModelsResponse = ModelInfo[];

// GET /metrics
export interface ConfidenceInterval {
  point: number;
  lower: number;
  upper: number;
}
export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}
export interface RocPoint {
  fpr: number;
  tpr: number;
  threshold: number;
}
export interface PrPoint {
  recall: number;
  precision: number;
  threshold: number;
}
export interface ReliabilityPoint {
  bin_confidence: number;
  bin_accuracy: number;
  bin_count: number;
}
export interface RiskCoveragePoint {
  coverage: number;
  risk: number;
  threshold: number;
}

export interface ModelMetrics {
  model_id: ModelId;
  accuracy: ConfidenceInterval;
  precision: ConfidenceInterval;
  recall: ConfidenceInterval;
  f1: ConfidenceInterval;
  auroc: ConfidenceInterval;
  auprc: ConfidenceInterval;
  ece: number;
  reliability_diagram: ReliabilityPoint[];
  roc_curve: RocPoint[];
  pr_curve: PrPoint[];
  confusion_matrix: ConfusionMatrix;
  risk_coverage_curve: RiskCoveragePoint[];
  ood_auroc: number;
  selected_threshold: number;
  test_set_size: number;
}

export interface ClaheAblationResult {
  model_id: ModelId; // ablation hanya di model terbaik, per spec §11
  with_clahe: { accuracy: ConfidenceInterval; f1: ConfidenceInterval; auroc: ConfidenceInterval };
  without_clahe: { accuracy: ConfidenceInterval; f1: ConfidenceInterval; auroc: ConfidenceInterval };
}

export interface MetricsResponse {
  generated_at: string;
  config_hash: string;
  models: ModelMetrics[];
  clahe_ablation: ClaheAblationResult;
}

// POST /predict
export interface PredictRequest {
  image: File;
  model_id: ModelId;
  threshold?: number;
}
export interface PredictResponse {
  model_id: ModelId;
  label: Decision;
  raw_probability: number;
  calibrated_probability: number;
  threshold: number;
  decision: Decision;
  latency_ms: number;
  is_ood: boolean;
}

// POST /explain
export interface ExplainRequest {
  image: File;
  model_id: ModelId;
}
export interface ExplainResponse {
  model_id: ModelId;
  heatmap_png_base64: string;
  probability: number;
  latency_ms: number;
}

// POST /predict/batch
export interface PredictBatchRequest {
  images: File[];
  model_id: ModelId;
  threshold?: number;
}
export interface PredictBatchResponse {
  results: (PredictResponse & { filename: string })[];
}

// POST /compare
export interface CompareRequest {
  image: File;
}
export interface CompareModelResult extends PredictResponse {
  heatmap_png_base64: string;
}
export interface CompareResponse {
  results: CompareModelResult[];
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
