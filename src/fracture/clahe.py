"""
CLAHE (Contrast Limited Adaptive Histogram Equalization) -- spec §11
ablation, dijalankan HANYA di model terbaik (Base -- akurasi point
tertinggi bareng Large, dipilih krn lebih murah komputasi; CI 95%
keempat model overlap, jadi ini pilihan operasional eksplisit, BUKAN
klaim "Base terbukti terbaik" -- lihat CLAUDE.md).

Parameter (clipLimit=2.0, tileGridSize=(8,8)) diwarisi dari
`data experiment/convnext_tiny.py` -- fungsi `apply_clahe()` di situ
DIDEFINISIKAN tapi TIDAK PERNAH benar-benar dipakai sbg
preprocessing_function training (dead code, lihat CLAUDE.md M1: "CLAHE
berubah dari dead code menjadi variabel eksperimen yang sah"). Parameter
yang sama dipakai lagi di sini supaya ablation ini sebanding dengan apa
yang dulu dimaksudkan, bukan angka baru tanpa rujukan.

TERPISAH dari src/fracture/data.py (`preprocess_image()`) SENGAJA --
CLAHE cuma dipakai utk SATU eksperimen ablation (Base saja), bukan
bagian pipeline preprocessing produksi. Backend (`api/`) TIDAK pernah
mengimpor modul ini.
"""

import numpy as np


def apply_clahe(img: np.ndarray) -> np.ndarray:
    """img: (H,W,3) uint8 atau float [0,255]. Return (H,W,3) float32 [0,255].

    X-ray secara inheren monokrom (disimpan sbg RGB dgn R=G=B) -- CLAHE
    diterapkan di ruang grayscale (konsisten dgn arsip lama), lalu
    direplikasi ke 3 channel supaya bentuk input (H,W,3) yang dibutuhkan
    ConvNeXt tetap terjaga, tanpa kehilangan informasi warna yang memang
    tidak ada di X-ray.
    """
    import cv2

    img_uint8 = np.asarray(img).astype(np.uint8)
    gray = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2GRAY) if img_uint8.ndim == 3 else img_uint8
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)
    return np.stack([equalized] * 3, axis=-1).astype(np.float32)
