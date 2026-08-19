"""
Skema Pydantic -- cermin PERSIS `web/src/lib/api/types.ts` (yang itu sendiri
cermin spec §9). Kalau kontrak berubah, urutannya: spec §9 -> file ini ->
types.ts -- bukan sebaliknya (lihat komentar di puncak types.ts).
"""

from typing import Literal

from pydantic import BaseModel

ModelId = Literal["tiny", "small", "base", "large"]
Decision = Literal["fractured", "not_fractured", "abstain"]


# ---- GET /health ----
class HealthResponse(BaseModel):
    status: Literal["cold", "warming", "ready"]
    uptime_s: float | None
    eta_s: float | None


# ---- GET /models ----
class ModelInfo(BaseModel):
    id: ModelId
    label: str
    params_millions: float
    input_size: int
    onnx_size_mb: float
    description: str


# ---- GET /metrics (isi results/metrics.json apa adanya) ----
class ConfidenceInterval(BaseModel):
    point: float
    lower: float
    upper: float


class ConfusionMatrix(BaseModel):
    tp: int
    fp: int
    tn: int
    fn: int


class RocPoint(BaseModel):
    fpr: float
    tpr: float
    threshold: float


class PrPoint(BaseModel):
    recall: float
    precision: float
    threshold: float


class ReliabilityPoint(BaseModel):
    bin_confidence: float
    bin_accuracy: float
    bin_count: int


class RiskCoveragePoint(BaseModel):
    coverage: float
    risk: float
    threshold: float


class ModelMetrics(BaseModel):
    model_id: ModelId
    accuracy: ConfidenceInterval
    precision: ConfidenceInterval
    recall: ConfidenceInterval
    f1: ConfidenceInterval
    auroc: ConfidenceInterval
    auprc: ConfidenceInterval
    ece: float
    reliability_diagram: list[ReliabilityPoint]
    roc_curve: list[RocPoint]
    pr_curve: list[PrPoint]
    confusion_matrix: ConfusionMatrix
    risk_coverage_curve: list[RiskCoveragePoint]
    ood_auroc: float
    selected_threshold: float
    test_set_size: int

    class Config:
        extra = "ignore"  # metrics.json py punya field debug tambahan (_temperature dst) -- bukan bagian kontrak publik


class ClaheAblationMetricSet(BaseModel):
    accuracy: ConfidenceInterval
    f1: ConfidenceInterval
    auroc: ConfidenceInterval


class ClaheAblationResult(BaseModel):
    model_id: ModelId
    with_clahe: ClaheAblationMetricSet
    without_clahe: ClaheAblationMetricSet


class MetricsResponse(BaseModel):
    generated_at: str
    config_hash: str
    models: list[ModelMetrics]
    clahe_ablation: ClaheAblationResult | None = None  # belum ada sampai spec Sec11 dikerjakan


# ---- POST /predict ----
class PredictResponse(BaseModel):
    model_id: ModelId
    label: Decision
    raw_probability: float
    calibrated_probability: float
    threshold: float
    decision: Decision
    latency_ms: float
    is_ood: bool


# ---- POST /explain ----
class ExplainResponse(BaseModel):
    model_id: ModelId
    heatmap_png_base64: str
    probability: float
    latency_ms: float


# ---- POST /predict/batch ----
class PredictBatchResultItem(PredictResponse):
    filename: str


class PredictBatchResponse(BaseModel):
    results: list[PredictBatchResultItem]


# ---- POST /compare ----
class CompareModelResult(PredictResponse):
    heatmap_png_base64: str


class CompareResponse(BaseModel):
    results: list[CompareModelResult]
