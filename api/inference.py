"""
Pipeline inferensi -- ONNX Runtime (backbone CNN) + NumPy murni (Grad-CAM,
OOD, kalibrasi). TIDAK ada TensorFlow di sini sama sekali (spec §8: image
Docker ~400MB, bukan ~3GB dengan TF penuh).

Satu `ModelArtifact` = satu file `.onnx` (2 output: prob, featmap) + satu
file `.npz` companion (bobot head Dense-512/Dense-1 + parameter kalibrasi/
threshold/OOD -- lihat src/fracture/export_onnx.py utk skema penulisannya).

KONVENSI LABEL (sama seperti src/fracture/evaluate.py -- WAJIB dipatuhi):
output mentah ONNX = P(not_fractured) (index 1 Keras, alfabetis). Modul
ini SEGERA mengonversi ke prob_fractured di titik masuk (`ModelArtifact.
forward`), supaya kode di bawahnya (kalibrasi, threshold, Grad-CAM) tidak
pernah menyentuh konvensi Keras yang mentah.
"""

import io
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

# src/ dari repo root -- reuse SATU-SATUNYA preprocessing (fix F1, lihat
# src/fracture/data.py) supaya backend TIDAK menulis ulang preprocessing
# terpisah dari training (itu bug utama eksperimen lama).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.fracture import calibration, gradcam, ood  # noqa: E402
from src.fracture.data import preprocess_image  # noqa: E402

from .config import IMG_SIZE, MODEL_DIR  # noqa: E402

HEATMAP_COLOR_RGB = (255, 122, 69)  # --primitive-grease, tokens.css -- identitas visual "fractured"/Grad-CAM


class ModelArtifact:
    """Satu model ConvNeXt ter-load: sesi ONNX Runtime + bobot head NumPy."""

    def __init__(self, model_id: str, onnx_path: Path, npz_path: Path):
        self.model_id = model_id
        self.session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

        # Urutan output ONNX TIDAK bisa diasumsikan tetap (pelajaran dari
        # ekspor -- lihat src/fracture/export_onnx.py verify_prob_parity) --
        # identifikasi lewat shape: prob=(N,1), featmap=(N,H,W,C).
        outputs = self.session.get_outputs()
        prob_candidates = [i for i, o in enumerate(outputs) if len(o.shape) == 2]
        if len(prob_candidates) != 1:
            raise ValueError(f"[{model_id}] Tidak bisa identifikasi output prob dari shape: {[o.shape for o in outputs]}")
        self.prob_idx = prob_candidates[0]
        self.featmap_idx = 1 - self.prob_idx

        head = np.load(npz_path)
        self.w1 = head["w1"]
        self.b1 = head["b1"]
        self.w2 = head["w2"]
        self.b2 = float(head["b2"])
        self.temperature = float(head["temperature"])
        self.threshold = float(head["threshold"])
        self.ood_mean = head["ood_mean"]
        self.ood_inv_cov = head["ood_inv_cov"]
        self.ood_threshold = float(head["ood_threshold"])

    def forward(self, image_batch: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """image_batch: (1,H,W,3) sudah preprocessed. Return (prob_fractured, featmap)."""
        outputs = self.session.run(None, {self.input_name: image_batch.astype(np.float32)})
        raw_not_fractured = outputs[self.prob_idx].squeeze(axis=-1)  # P(not_fractured), konvensi Keras
        prob_fractured = 1.0 - raw_not_fractured
        featmap = outputs[self.featmap_idx]
        return prob_fractured, featmap


def load_and_preprocess_image(image_bytes: bytes, img_size: int = IMG_SIZE) -> tuple[np.ndarray, Image.Image]:
    """Return (batch (1,H,W,3) preprocessed, PIL.Image asli RGB -- utk referensi ukuran overlay)."""
    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    resized = original.resize((img_size, img_size), Image.BICUBIC)
    arr = np.array(resized, dtype=np.float32)
    batch = preprocess_image(arr)[np.newaxis, ...]
    return batch, original


def render_heatmap_png(heatmap: np.ndarray, output_size: tuple[int, int]) -> str:
    """heatmap: (h,w) di [0,1]. Return PNG base64 -- warna solid grease-oranye,
    alpha kontinu = intensitas heatmap (dipakai frontend dgn mix-blend-mode
    'screen' + slider opacity, lihat GradCamOverlay.tsx)."""
    alpha = (np.clip(heatmap, 0.0, 1.0) * 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L").resize(output_size, Image.BICUBIC)
    rgba = Image.new("RGBA", output_size, (*HEATMAP_COLOR_RGB, 0))
    rgba.putalpha(alpha_img)
    buf = io.BytesIO()
    rgba.save(buf, format="PNG")
    import base64

    return base64.b64encode(buf.getvalue()).decode("ascii")


def compute_ood(artifact: ModelArtifact, featmap: np.ndarray) -> tuple[bool, float]:
    """GAP dari featmap -> jarak Mahalanobis -> is_ood. Spec §9: gerbang OOD
    WAJIB jalan sebelum keputusan final -- tanpa ini foto non-X-ray tetap
    dapat prediksi berkeyakinan tinggi."""
    gap_feature = featmap.mean(axis=(1, 2))  # (1,C)
    score = ood.score_mahalanobis(gap_feature, artifact.ood_mean, artifact.ood_inv_cov)[0]
    return bool(score > artifact.ood_threshold), float(score)


def decide(prob_fractured_calibrated: float, threshold: float, is_ood: bool) -> tuple[str, str]:
    """(label, decision). label SELALU dua-nilai (fractured/not_fractured) --
    murni posisi relatif thd threshold. decision bisa jadi 'abstain' kalau
    is_ood True (spec §9: abstain dipicu gerbang OOD, bukan margin dekat
    threshold -- itu konsep terpisah, selective prediction, cuma dianalisis
    offline lewat risk_coverage_curve, tidak menggerakkan keputusan live)."""
    label = "fractured" if prob_fractured_calibrated >= threshold else "not_fractured"
    decision = "abstain" if is_ood else label
    return label, decision


def _full_analysis(
    artifact: ModelArtifact,
    image_bytes: bytes,
    threshold_override: float | None = None,
    compute_gradcam: bool = False,
) -> dict:
    """Satu forward-pass, dipakai bersama oleh predict()/explain()/compare --
    supaya kalibrasi & keputusan OOD TIDAK PERNAH bisa drift antar endpoint
    (risiko nyata kalau logic sama ditulis ulang di 3 tempat terpisah)."""
    start = time.perf_counter()
    batch, original_image = load_and_preprocess_image(image_bytes)
    prob_fractured, featmap = artifact.forward(batch)
    raw_probability = float(prob_fractured[0])

    calibrated = float(calibration.apply_temperature(prob_fractured, artifact.temperature)[0])
    threshold = threshold_override if threshold_override is not None else artifact.threshold
    is_ood, _ood_score = compute_ood(artifact, featmap)
    label, decision = decide(calibrated, threshold, is_ood)

    result = {
        "model_id": artifact.model_id,
        "label": label,
        "raw_probability": raw_probability,
        "calibrated_probability": calibrated,
        "threshold": threshold,
        "decision": decision,
        "is_ood": is_ood,
    }

    if compute_gradcam:
        gap_feature = featmap[0].mean(axis=(0, 1))  # (C,) -- featmap[0]: (H,W,C)
        z = gradcam.compute_z(gap_feature, artifact.w1, artifact.b1)
        # Grad-CAM menjelaskan LABEL (posisi thd threshold), bukan `decision`
        # yg bisa "abstain" -- abstain bukan arah kelas, tidak ada gradiennya.
        heatmap = gradcam.compute_heatmap(featmap[0], z, artifact.w1, artifact.w2, explain_class=label)
        result["heatmap_png_base64"] = render_heatmap_png(heatmap, original_image.size)

    result["latency_ms"] = (time.perf_counter() - start) * 1000
    return result


def predict(artifact: ModelArtifact, image_bytes: bytes, threshold_override: float | None = None) -> dict:
    """Prediksi tanpa Grad-CAM (dipakai /predict, /predict/batch) -- bentuk cocok PredictResponse."""
    return _full_analysis(artifact, image_bytes, threshold_override, compute_gradcam=False)


def explain(artifact: ModelArtifact, image_bytes: bytes) -> dict:
    """Prediksi + Grad-CAM -- bentuk cocok ExplainResponse (subset field) /
    CompareModelResult (dipakai /explain, /compare)."""
    full = _full_analysis(artifact, image_bytes, threshold_override=None, compute_gradcam=True)
    return {
        "model_id": full["model_id"],
        "heatmap_png_base64": full["heatmap_png_base64"],
        "probability": full["calibrated_probability"],
        "latency_ms": full["latency_ms"],
    }


def predict_and_explain(artifact: ModelArtifact, image_bytes: bytes) -> dict:
    """Bentuk lengkap PredictResponse + heatmap_png_base64 -- dipakai /compare (spec Sec9: CompareModelResult)."""
    return _full_analysis(artifact, image_bytes, threshold_override=None, compute_gradcam=True)
