# HF Docker Space (spec §9) -- image target ~400MB (TANPA TensorFlow,
# lihat src/fracture/gradcam.py & api/inference.py: Grad-CAM/OOD/kalibrasi
# semuanya NumPy murni). Dibangun dari ROOT REPO (docker build -f
# api/Dockerfile .), bukan dari dalam api/ -- karena butuh src/fracture/
# sebagai sibling (lihat sys.path.insert di api/inference.py).
FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# src/fracture/* -- WAJIB sinkron dgn training (preprocessing, konvensi
# label, Grad-CAM analitik). api/* -- kode server.
COPY src/ ./src/
COPY api/ ./api/

# Bobot model (.onnx + .npz) TIDAK di-COPY dari build context -- diunduh
# dari HF Model repo terpisah saat container start (spec Sec9), supaya
# repo Space sendiri tetap ringan. BELUM diimplementasikan (repo HF Model
# belum dibuat) -- untuk sekarang, MODEL_DIR harus di-mount/diisi manual
# saat testing lokal (docker run -v ./model_artifacts:/app/model_artifacts).
ENV MODEL_DIR=/app/model_artifacts
ENV RESULTS_METRICS_PATH=/app/results/metrics.json
# CATATAN: results/metrics.json BELUM ADA di repo saat Dockerfile ini
# ditulis (notebook 03_evaluate_export.ipynb masih berjalan) -- build
# akan GAGAL sampai file itu di-commit. Jangan coba `docker build` sebelum itu.
COPY results/metrics.json ./results/metrics.json

# HF Spaces (Docker) selalu expose port 7860.
EXPOSE 7860
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]
