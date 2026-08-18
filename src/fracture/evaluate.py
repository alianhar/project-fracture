"""
Evaluasi formal (spec §7): bootstrap 95% CI, pemilihan threshold di
VALIDATION (bukan test -- fix F4, kebocoran fatal di eksperimen lama),
kurva ROC/PR, dan risk-coverage curve untuk selective prediction.

KONVENSI LABEL -- WAJIB DIPATUHI DI SELURUH KODE PEMANGGIL:
Keras `flow_from_dataframe(class_mode="binary")` meng-assign index kelas
berdasar URUTAN ALFABETIS: index 0 = "fractured", index 1 = "not_fractured"
(lihat src/fracture/data.py CLASS_NAMES). Artinya output sigmoid mentah
model = P(not_fractured) -- TERBALIK dari yang biasa diasumsikan (fractured
sebagai kelas "positif" klinis, sesuai token desain --positive di web).

Untuk menghindari bug diam-diam (AUROC/dsb terhitung terbalik), SELURUH
fungsi di modul ini menerima `prob_fractured` (P(kelas="fractured")) dan
`y_fractured` (1 jika fractured, 0 jika bukan) -- BUKAN output mentah Keras.
Pemanggil (notebook) WAJIB konversi eksplisit:
    prob_fractured = 1 - raw_sigmoid_output
    y_fractured = (class_index == 0).astype(int)  # index 0 = fractured
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

METRIC_NAMES = ("accuracy", "precision", "recall", "f1", "auroc", "auprc")


def compute_point_metrics(y_fractured, y_pred_fractured, prob_fractured) -> dict:
    return {
        "accuracy": accuracy_score(y_fractured, y_pred_fractured),
        "precision": precision_score(y_fractured, y_pred_fractured, zero_division=0),
        "recall": recall_score(y_fractured, y_pred_fractured, zero_division=0),
        "f1": f1_score(y_fractured, y_pred_fractured, zero_division=0),
        "auroc": roc_auc_score(y_fractured, prob_fractured),
        "auprc": average_precision_score(y_fractured, prob_fractured),
    }


def bootstrap_ci(y_fractured, prob_fractured, threshold, n_resamples=2000, seed=42, alpha=0.05) -> dict:
    """95% CI via bootstrap resampling (spec §7, 2000 resample/metrik).

    Resample yang kebetulan cuma berisi 1 kelas dilewati (AUROC/AUPRC
    tidak terdefinisi) -- proporsi dilewati biasanya sangat kecil untuk
    n~500 dengan kelas tidak terlalu timpang, tidak bias hasil akhir.
    """
    rng = np.random.default_rng(seed)
    y_fractured = np.asarray(y_fractured)
    prob_fractured = np.asarray(prob_fractured)
    n = len(y_fractured)

    samples = {m: [] for m in METRIC_NAMES}
    skipped = 0
    for _ in range(n_resamples):
        idx = rng.integers(0, n, size=n)
        yt, pf = y_fractured[idx], prob_fractured[idx]
        if len(np.unique(yt)) < 2:
            skipped += 1
            continue
        pred = (pf >= threshold).astype(int)
        m = compute_point_metrics(yt, pred, pf)
        for k in METRIC_NAMES:
            samples[k].append(m[k])

    point = compute_point_metrics(y_fractured, (prob_fractured >= threshold).astype(int), prob_fractured)
    result = {"skipped_resamples": skipped}
    for k in METRIC_NAMES:
        arr = np.array(samples[k])
        result[k] = {
            "point": float(point[k]),
            "lower": float(np.percentile(arr, 100 * alpha / 2)),
            "upper": float(np.percentile(arr, 100 * (1 - alpha / 2))),
        }
    return result


def select_threshold_youden(y_fractured_val, prob_fractured_val) -> float:
    """Youden's J (max TPR-FPR) di VALIDATION -- fix F4: eksperimen lama
    mencari threshold optimal di TEST SET, itu kebocoran data."""
    fpr, tpr, thresholds = roc_curve(y_fractured_val, prob_fractured_val)
    j = tpr - fpr
    best_idx = int(np.argmax(j))
    return float(thresholds[best_idx])


def roc_points(y_fractured, prob_fractured, n_points=15) -> list[dict]:
    fpr, tpr, thresholds = roc_curve(y_fractured, prob_fractured)
    idx = np.unique(np.linspace(0, len(fpr) - 1, min(n_points, len(fpr))).astype(int))
    out = []
    for i in idx:
        thr = thresholds[i]
        out.append({"fpr": float(fpr[i]), "tpr": float(tpr[i]), "threshold": float(thr) if np.isfinite(thr) else 1.0})
    return out


def pr_points(y_fractured, prob_fractured, n_points=15) -> list[dict]:
    precision, recall, thresholds = precision_recall_curve(y_fractured, prob_fractured)
    # thresholds punya 1 elemen lebih sedikit dari precision/recall (sklearn)
    n = len(thresholds)
    idx = np.unique(np.linspace(0, n - 1, min(n_points, n)).astype(int))
    return [{"recall": float(recall[i]), "precision": float(precision[i]), "threshold": float(thresholds[i])} for i in idx]


def confusion_matrix_dict(y_fractured, y_pred_fractured) -> dict:
    y_fractured = np.asarray(y_fractured)
    y_pred_fractured = np.asarray(y_pred_fractured)
    tp = int(np.sum((y_fractured == 1) & (y_pred_fractured == 1)))
    fn = int(np.sum((y_fractured == 1) & (y_pred_fractured == 0)))
    fp = int(np.sum((y_fractured == 0) & (y_pred_fractured == 1)))
    tn = int(np.sum((y_fractured == 0) & (y_pred_fractured == 0)))
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn}


def risk_coverage_curve(y_fractured, prob_fractured, threshold, abstain_band_max=0.45, n_points=20) -> list[dict]:
    """Selective prediction (spec §7): abstain kalau |prob-threshold| < margin.
    Margin makin besar -> makin banyak abstain -> coverage turun, risk
    (error rate di sisa yang dijawab) idealnya ikut turun."""
    y_fractured = np.asarray(y_fractured)
    prob_fractured = np.asarray(prob_fractured)
    margins = np.linspace(0, abstain_band_max, n_points)
    points = []
    for margin in margins:
        keep = np.abs(prob_fractured - threshold) >= margin
        coverage = float(keep.mean())
        if coverage == 0:
            continue
        pred = (prob_fractured[keep] >= threshold).astype(int)
        risk = 1.0 - accuracy_score(y_fractured[keep], pred)
        points.append({"coverage": coverage, "risk": float(risk), "abstain_band": float(margin)})
    return sorted(points, key=lambda p: p["coverage"])
