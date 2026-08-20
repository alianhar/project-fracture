"""
Konfigurasi backend -- path model, metadata statis (`/models`), dan
pengaturan lain. File `.onnx`/`.npz` diunduh LAZY dari Google Cloud
Storage saat pertama dibutuhkan (lihat model_registry.py) -- MODEL_DIR
di sini cuma direktori cache lokal (disk container Cloud Run bersifat
ephemeral, tapi cukup untuk cache selama satu instance hidup, sejalan
dgn desain LRU: paling banyak `MODEL_CACHE_SIZE` model resident sekaligus).
"""

import os
from pathlib import Path

# Direktori CACHE lokal tempat {tiny,small,base,large}.onnx +
# {tiny,small,base,large}_head.npz disimpan setelah diunduh dari GCS (atau
# di-mount/diisi manual saat dev lokal). Default RELATIF terhadap file ini
# (api/model_artifacts/), BUKAN cwd proses -- supaya konsisten mau
# dijalankan dari mana pun. Override lewat env var saat deploy.
MODEL_DIR = Path(os.environ.get("MODEL_DIR", str(Path(__file__).resolve().parent / "model_artifacts")))

# Bucket GCS tempat .onnx/.npz ASLI disimpan (spec Sec9 pengganti "HF Model
# repo" -- lihat CLAUDE.md, deviasi krn HF Spaces Docker jadi berbayar).
# Kalau kosong (default), model_registry.get_model() TIDAK mencoba unduh --
# murni baca dari MODEL_DIR lokal (cocok utk dev/test lokal spt sekarang).
GCS_BUCKET = os.environ.get("GCS_BUCKET", "")

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
