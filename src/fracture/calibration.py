"""
Kalibrasi probabilitas via temperature scaling (spec §7). Model dilatih
sebagai Dense(1, sigmoid) TUNGGAL (aktivasi menyatu di layer, bukan
logit+sigmoid terpisah) — jadi logit didekati lewat inverse-sigmoid dari
probabilitas mentah: logit = ln(p/(1-p)), diclip untuk stabilitas numerik.
Ini pendekatan standar ketika output layer sudah menyatu dengan aktivasi
sejak awal training (tidak retroaktif bisa dipisah tanpa retrain).

Suhu (temperature) SELALU di-fit di VALIDATION, diterapkan ke test —
bukan sebaliknya (aturan yang sama dengan pemilihan threshold, spec §7).
"""

import numpy as np
from scipy.optimize import minimize_scalar

EPS = 1e-7


def prob_to_logit(prob: np.ndarray) -> np.ndarray:
    prob = np.clip(np.asarray(prob), EPS, 1 - EPS)
    return np.log(prob / (1 - prob))


def logit_to_prob(logit: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.asarray(logit)))


def _nll(temperature: float, logits: np.ndarray, y_fractured: np.ndarray) -> float:
    if temperature <= 0:
        return np.inf
    p = np.clip(logit_to_prob(logits / temperature), EPS, 1 - EPS)
    return float(-np.mean(y_fractured * np.log(p) + (1 - y_fractured) * np.log(1 - p)))


def fit_temperature(prob_fractured_val: np.ndarray, y_fractured_val: np.ndarray) -> float:
    """T yang minimalkan negative log-likelihood di VALIDATION."""
    logits = prob_to_logit(prob_fractured_val)
    y = np.asarray(y_fractured_val)
    result = minimize_scalar(_nll, bounds=(0.05, 10.0), args=(logits, y), method="bounded")
    return float(result.x)


def apply_temperature(prob_fractured: np.ndarray, temperature: float) -> np.ndarray:
    logits = prob_to_logit(prob_fractured)
    return logit_to_prob(logits / temperature)


def _confidence_and_correctness(y_fractured, prob_fractured):
    y_fractured = np.asarray(y_fractured)
    prob_fractured = np.asarray(prob_fractured)
    pred = (prob_fractured >= 0.5).astype(int)
    # confidence = keyakinan terhadap kelas yang DIPILIH (bukan sekadar
    # prob_fractured mentah) -- konvensi standar reliability diagram.
    confidence = np.where(prob_fractured >= 0.5, prob_fractured, 1 - prob_fractured)
    correct = (pred == y_fractured).astype(float)
    return confidence, correct


def expected_calibration_error(y_fractured, prob_fractured, n_bins: int = 10) -> float:
    """ECE: rata-rata |akurasi_bin - confidence_bin| dibobot proporsi sampel."""
    confidence, correct = _confidence_and_correctness(y_fractured, prob_fractured)
    n = len(confidence)
    bin_edges = np.linspace(0.5, 1.0, n_bins + 1)  # confidence selalu >= 0.5
    ece = 0.0
    for i in range(n_bins):
        lo, hi = bin_edges[i], bin_edges[i + 1]
        in_bin = (confidence >= lo) & (confidence <= hi if i == n_bins - 1 else confidence < hi)
        if in_bin.sum() == 0:
            continue
        ece += (in_bin.sum() / n) * abs(correct[in_bin].mean() - confidence[in_bin].mean())
    return float(ece)


def reliability_diagram_points(y_fractured, prob_fractured, n_bins: int = 10) -> list[dict]:
    """Format titik sama dengan fixture mock frontend (ReliabilityDiagramChart,
    web/src/mocks/fixtures/metrics.ts) -- bin_confidence/bin_accuracy/bin_count."""
    confidence, correct = _confidence_and_correctness(y_fractured, prob_fractured)
    bin_edges = np.linspace(0.5, 1.0, n_bins + 1)
    points = []
    for i in range(n_bins):
        lo, hi = bin_edges[i], bin_edges[i + 1]
        in_bin = (confidence >= lo) & (confidence <= hi if i == n_bins - 1 else confidence < hi)
        count = int(in_bin.sum())
        if count == 0:
            points.append({"bin_confidence": float((lo + hi) / 2), "bin_accuracy": 0.0, "bin_count": 0})
            continue
        points.append({
            "bin_confidence": float(confidence[in_bin].mean()),
            "bin_accuracy": float(correct[in_bin].mean()),
            "bin_count": count,
        })
    return points
