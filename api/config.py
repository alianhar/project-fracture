"""
Konfigurasi backend -- path model, metadata statis (`/models`), dan
pengaturan lain. Path model default mengasumsikan file `.onnx`/`.npz`
sudah ada di disk container (diunduh dari HF Model repo saat container
start -- lihat Dockerfile/entrypoint, BELUM diimplementasikan di sini
karena repo HF Model belum dibuat).
"""

import os
from pathlib import Path

# Direktori tempat {tiny,small,base,large}.onnx + {tiny,small,base,large}_head.npz
# berada. Default RELATIF terhadap file ini (api/model_artifacts/), BUKAN
# cwd proses -- supaya konsisten mau dijalankan dari mana pun
# (`uvicorn api.main:app` dari root repo, dari dalam api/, dsb). Override
# lewat env var saat deploy (HF Space container set path absolut).
MODEL_DIR = Path(os.environ.get("MODEL_DIR", str(Path(__file__).resolve().parent / "model_artifacts")))

IMG_SIZE = 224

# params_millions dari dokumentasi resmi Keras Applications (backbone only,
# include_top=False -- param head custom kita kecil, diabaikan di angka ini
# krn tujuannya cuma info kasar utk pengguna, bukan angka presisi ilmiah).
MODEL_REGISTRY_STATIC = {
    "tiny": {
        "label": "ConvNeXt Tiny",
        "params_millions": 27.8,
        "description": "Model tercepat & teringan -- cocok untuk inferensi latensi rendah.",
    },
    "small": {
        "label": "ConvNeXt Small",
        "params_millions": 49.5,
        "description": "Keseimbangan antara kecepatan dan akurasi.",
    },
    "base": {
        "label": "ConvNeXt Base",
        "params_millions": 87.6,
        "description": "Kapasitas lebih besar, akurasi berpotensi lebih tinggi dengan biaya latensi.",
    },
    "large": {
        "label": "ConvNeXt Large",
        "params_millions": 196.2,
        "description": "Model terbesar -- kapasitas representasi paling tinggi di antara keempatnya.",
    },
}

MODEL_IDS = tuple(MODEL_REGISTRY_STATIC.keys())

RESULTS_METRICS_PATH = Path(os.environ.get("RESULTS_METRICS_PATH", "./results/metrics.json"))

# Selective abstain khusus gerbang OOD (spec Sec9): "Gerbang OOD dijalankan
# SEBELUM prediksi. Tanpa ini, foto non-X-ray tetap menghasilkan prediksi
# berkeyakinan tinggi." -- abstain di sini murni dipicu status OOD, BUKAN
# margin dekat threshold (itu konsep terpisah, selective prediction, cuma
# dianalisis offline lewat risk_coverage_curve di evaluate.py, tidak
# menggerakkan keputusan live API).
