"""
FastAPI app -- endpoint per spec §9. Deploy sbg HF Docker Space (2 vCPU,
16GB RAM gratis). Bobot model (.onnx + .npz) diunduh dari HF Model repo
terpisah saat container start -- BELUM diimplementasikan (repo HF Model
belum dibuat, lihat CLAUDE.md); untuk sekarang server membaca dari
`MODEL_DIR` lokal (env var, default `./model_artifacts`).
"""

import json
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import inference, model_registry
from .config import MODEL_DIR, MODEL_IDS, MODEL_REGISTRY_STATIC, RESULTS_METRICS_PATH
from .schemas import (
    CompareResponse,
    ExplainResponse,
    HealthResponse,
    MetricsResponse,
    ModelInfo,
    PredictBatchResponse,
    PredictResponse,
)

app = FastAPI(title="Fracture Classification API")

# CORS longgar -- API publik tanpa autentikasi (spec: "Tanpa autentikasi
# di level aplikasi"), dikonsumsi dari domain frontend manapun (VPS demo,
# Vercel nanti, atau lokal dev) tanpa daftar origin statis yang perlu
# disinkronkan tiap kali domain berubah.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_START_TIME = time.time()


def _get_artifact_or_404(model_id: str):
    if model_id not in MODEL_IDS:
        raise HTTPException(status_code=400, detail=f"model_id tidak dikenal: {model_id!r}")
    try:
        return model_registry.get_model(model_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.get("/health", response_model=HealthResponse)
def health():
    # TODO: status "warming" seharusnya mencerminkan progres unduh bobot
    # model dari HF Model repo saat cold start Space -- belum diimplementasikan
    # krn repo HF Model belum ada. Untuk sekarang server dianggap "ready"
    # begitu proses FastAPI hidup (tidak menunggu model apa pun ter-load,
    # sesuai desain lazy-load).
    return HealthResponse(status="ready", uptime_s=time.time() - _START_TIME, eta_s=None)


@app.get("/models", response_model=list[ModelInfo])
def list_models():
    result = []
    for model_id, meta in MODEL_REGISTRY_STATIC.items():
        onnx_path = MODEL_DIR / f"{model_id}.onnx"
        onnx_size_mb = onnx_path.stat().st_size / (1024 * 1024) if onnx_path.exists() else 0.0
        result.append(
            ModelInfo(
                id=model_id,
                label=meta["label"],
                params_millions=meta["params_millions"],
                input_size=inference.IMG_SIZE,
                onnx_size_mb=round(onnx_size_mb, 1),
                description=meta["description"],
            )
        )
    return result


@app.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    if not RESULTS_METRICS_PATH.exists():
        raise HTTPException(status_code=503, detail=f"{RESULTS_METRICS_PATH} belum ada -- notebook evaluasi belum dijalankan/di-commit.")
    return json.loads(RESULTS_METRICS_PATH.read_text())


@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...), model_id: str = Form(...), threshold: float | None = Form(None)):
    artifact = _get_artifact_or_404(model_id)
    image_bytes = await image.read()
    return inference.predict(artifact, image_bytes, threshold_override=threshold)


@app.post("/explain", response_model=ExplainResponse)
async def explain(image: UploadFile = File(...), model_id: str = Form(...)):
    artifact = _get_artifact_or_404(model_id)
    image_bytes = await image.read()
    return inference.explain(artifact, image_bytes)


@app.post("/predict/batch", response_model=PredictBatchResponse)
async def predict_batch(images: list[UploadFile] = File(...), model_id: str = Form(...), threshold: float | None = Form(None)):
    artifact = _get_artifact_or_404(model_id)
    results = []
    for image in images:
        image_bytes = await image.read()
        prediction = inference.predict(artifact, image_bytes, threshold_override=threshold)
        results.append({**prediction, "filename": image.filename})
    return {"results": results}


@app.post("/compare", response_model=CompareResponse)
async def compare(image: UploadFile = File(...)):
    image_bytes = await image.read()
    results = []
    for model_id in MODEL_IDS:
        artifact = _get_artifact_or_404(model_id)
        results.append(inference.predict_and_explain(artifact, image_bytes))
    return {"results": results}
