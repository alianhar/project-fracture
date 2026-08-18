"""
Grad-CAM analitik (spec §8) -- bentuk tertutup untuk head
GAP -> Dense(512, gelu) -> Dropout -> Dense(1, sigmoid) (lihat model.py).
Turunan dihitung langsung dari bobot Dense, TANPA backprop framework --
inilah yang memungkinkan Grad-CAM dihitung di NumPy murni saat inference
ONNX (server tidak perlu TensorFlow, cukup featmap dari ONNX + bobot head
kecil yang diekspor terpisah, lihat export_onnx.py).

Turunan (y = logit pra-sigmoid, A = feature map HxWxC, g=GAP(A), z=W1^T g+b1):
    dy/dA[h,w,c] = (1/HW) * sum_j( W2[j] * gelu'(z_j) * W1[c,j] )
    (konstan untuk semua h,w -- ini "pooled gradient" ala Grad-CAM klasik,
    di sini didapat analitik, bukan lewat rata-rata gradien numerik)

    heatmap[h,w] = ReLU( sum_c( pooled_grad[c] * A[h,w,c] ) )

ARAH GRADIEN (fix B3 -- bug eksperimen lama): y merepresentasikan arah
"not_fractured" (index 1 Keras, lihat evaluate.py). Untuk Grad-CAM yang
menjelaskan kelas "fractured", gradien harus DINEGASIKAN -- eksperimen
lama selalu pakai satu arah tetap, salah untuk prediksi kelas negatif.
"""

import numpy as np
from scipy.special import erf


def gelu_derivative(x: np.ndarray) -> np.ndarray:
    """Turunan GELU eksak (bukan aproksimasi tanh) -- cocok dengan
    activation='gelu' default Keras (approximate=False)."""
    x = np.asarray(x)
    phi = 0.5 * (1 + erf(x / np.sqrt(2)))                    # CDF normal standar
    pdf = (1 / np.sqrt(2 * np.pi)) * np.exp(-0.5 * x**2)      # PDF normal standar
    return phi + x * pdf


def compute_z(gap_features: np.ndarray, w1: np.ndarray, b1: np.ndarray) -> np.ndarray:
    """Pra-aktivasi Dense-512 dari fitur GAP -- direkonstruksi manual karena
    layer 'feature_dense' menyatukan Dense+gelu (tidak ada hook langsung ke
    pra-aktivasi dari model Keras asli).
    gap_features: (C,) atau (N,C). w1: (C,512). b1: (512,)."""
    return gap_features @ w1 + b1


def compute_pooled_gradient(z: np.ndarray, w1: np.ndarray, w2: np.ndarray) -> np.ndarray:
    """pooled_grad[c] -- lihat turunan di docstring modul.
    z: (512,) pra-aktivasi Dense-512. w1: (C,512). w2: (512,) (Dense(1) squeeze).
    Return: (C,) -- satu skalar per channel feature map (BELUM dibagi HW)."""
    weighted = w2 * gelu_derivative(z)   # (512,)
    return w1 @ weighted                  # (C,512) @ (512,) -> (C,)


def compute_heatmap(
    featmap: np.ndarray,
    z: np.ndarray,
    w1: np.ndarray,
    w2: np.ndarray,
    explain_class: str = "fractured",
) -> np.ndarray:
    """featmap: (H,W,C) output stage terakhir backbone (sebelum GAP).
    explain_class: "fractured" atau "not_fractured" -- lihat catatan arah
    gradien di docstring modul (fix B3).
    Return: heatmap (H,W), ReLU + dinormalisasi ke [0,1]."""
    if explain_class not in ("fractured", "not_fractured"):
        raise ValueError(f"explain_class harus 'fractured' atau 'not_fractured', dapat: {explain_class!r}")

    h, w_dim, _ = featmap.shape
    pooled = compute_pooled_gradient(z, w1, w2) / (h * w_dim)
    if explain_class == "fractured":
        pooled = -pooled  # y = arah not_fractured -> fractured perlu dinegasikan

    heatmap = np.maximum(np.tensordot(featmap, pooled, axes=([2], [0])), 0)  # (H,W)
    max_val = heatmap.max()
    if max_val > 1e-8:
        heatmap = heatmap / max_val
    return heatmap
