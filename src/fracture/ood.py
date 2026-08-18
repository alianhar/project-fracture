"""
Gerbang out-of-distribution / OOD (spec §7 & §9) via jarak Mahalanobis di
ruang fitur GAP (output GlobalAveragePooling2D, SEBELUM head Dense) --
fitur yang sama dipakai gradcam.py untuk merekonstruksi z. Statistik
(mean, kovarians) di-fit HANYA dari fitur training in-distribution (X-ray
tulang); threshold dipilih dari validation ID; dievaluasi (AUROC) terhadap
campuran ID (val/test) vs OOD (dataset publik non-X-ray, mis. CIFAR-10 --
lihat notebook 03).
"""

import numpy as np


def fit_mahalanobis(features_id_train: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """features_id_train: (N,C) fitur GAP dari gambar training (in-distribution).
    Return: (mean, inv_cov) -- dipakai score_mahalanobis()."""
    features_id_train = np.asarray(features_id_train)
    mean = features_id_train.mean(axis=0)
    cov = np.cov(features_id_train, rowvar=False)
    # Regularisasi diagonal kecil -- cegah matriks (nyaris) singular kalau
    # dimensi fitur C besar relatif ke N, atau ada fitur nyaris konstan.
    cov = cov + np.eye(cov.shape[0]) * 1e-6
    inv_cov = np.linalg.inv(cov)
    return mean, inv_cov


def score_mahalanobis(features: np.ndarray, mean: np.ndarray, inv_cov: np.ndarray) -> np.ndarray:
    """Jarak Mahalanobis tiap baris `features` ke distribusi ID training.
    Makin besar -> makin jauh dari training -> makin mungkin OOD."""
    diff = np.asarray(features) - mean
    return np.sqrt(np.einsum("ij,jk,ik->i", diff, inv_cov, diff))


def evaluate_ood_auroc(scores_id: np.ndarray, scores_ood: np.ndarray) -> float:
    """AUROC gerbang OOD: seberapa baik skor Mahalanobis memisahkan ID vs OOD
    (label 1 = OOD, konsisten arah "skor besar = OOD")."""
    from sklearn.metrics import roc_auc_score

    y = np.concatenate([np.zeros(len(scores_id)), np.ones(len(scores_ood))])
    scores = np.concatenate([scores_id, scores_ood])
    return float(roc_auc_score(y, scores))


def select_ood_threshold(scores_id_val: np.ndarray, percentile: float = 95.0) -> float:
    """Threshold dari VALIDATION ID (bukan test, bukan OOD) -- persentil
    ke-95 skor ID val, supaya ~5% gambar ID val sendiri "salah" ditandai
    OOD (trade-off wajar antara sensitivitas gerbang dan false-alarm)."""
    return float(np.percentile(np.asarray(scores_id_val), percentile))
