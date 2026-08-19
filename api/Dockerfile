# Google Cloud Run (spec §9 DEVIASI -- lihat CLAUDE.md: HF Spaces
# mengubah Docker SDK jadi berbayar $9/bln PRO sejak ~Juli 2026, tanpa
# pengumuman resmi. Cloud Run dipilih sebagai gantinya: free tier
# permanen (2 juta request/bln), scale-to-zero (cold start mirip yang
# sudah direncanakan di spec Sec9/Sec10), Docker-native).
#
# Image target ~400MB (TANPA TensorFlow -- lihat src/fracture/gradcam.py
# & api/inference.py: Grad-CAM/OOD/kalibrasi semuanya NumPy murni).
# Dibangun dari ROOT REPO (docker build -f api/Dockerfile .), bukan dari
# dalam api/ -- karena butuh src/fracture/ sebagai sibling (lihat
# sys.path.insert di api/inference.py).
FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# src/fracture/* -- WAJIB sinkron dgn training (preprocessing, konvensi
# label, Grad-CAM analitik). api/* -- kode server.
COPY src/ ./src/
COPY api/ ./api/

# Bobot model (.onnx + .npz) TIDAK di-COPY dari build context -- rencana:
# unduh dari Google Cloud Storage saat container start (pengganti pola
# "HF Model repo" di spec Sec9 asli, krn target deploy pindah ke Cloud
# Run). BELUM diimplementasikan (bucket GCS belum dibuat, script unduh
# belum ditulis) -- untuk sekarang, MODEL_DIR harus di-mount/diisi manual
# saat testing lokal (docker run -v ./model_artifacts:/app/model_artifacts).
ENV MODEL_DIR=/app/model_artifacts
ENV RESULTS_METRICS_PATH=/app/results/metrics.json
# CATATAN: results/metrics.json BELUM ADA di repo saat Dockerfile ini
# ditulis (notebook 03_evaluate_export.ipynb masih berjalan) -- build
# akan GAGAL sampai file itu di-commit. Jangan coba `docker build` sebelum itu.
COPY results/metrics.json ./results/metrics.json

# Cloud Run MEWAJIBKAN container listen di 0.0.0.0:$PORT -- platform
# nyuntik env var PORT saat runtime (default 8080 kalau tidak di-set,
# dipakai fallback utk testing lokal `docker run` tanpa Cloud Run).
# CMD shell-form (bukan array JSON) supaya ${PORT} bisa di-substitusi.
ENV PORT=8080
EXPOSE 8080
CMD exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT}
