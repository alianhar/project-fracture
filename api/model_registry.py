"""
Lazy-load + LRU cache untuk keempat model (spec §9: "Model di-lazy load
dengan LRU cache agar boot cepat dan penggunaan RAM terkendali."). Default
cuma 2 model resident sekaligus -- container Cloud Run tidak perlu
menampung keempat ConvNeXt (Tiny..Large) bersamaan setiap saat.

Kalau `GCS_BUCKET` diisi (deploy Cloud Run), file `.onnx`/`.npz` yang
belum ada di `MODEL_DIR` lokal diunduh dari bucket itu SEKALI per model
(lazy, konsisten dgn desain LRU) -- bukan semua diunduh di awal saat
container start.
"""

import os
from collections import OrderedDict
from pathlib import Path

from .config import GCS_BUCKET, MODEL_DIR, MODEL_IDS
from .inference import ModelArtifact

_MAX_LOADED = int(os.environ.get("MODEL_CACHE_SIZE", "2"))
_cache: "OrderedDict[str, ModelArtifact]" = OrderedDict()


def _download_from_gcs(blob_name: str, dest_path: Path) -> None:
    """Unduh satu blob ke `dest_path`, lewat file sementara + rename atomik
    -- supaya download yang terputus di tengah jalan tidak meninggalkan
    file setengah-jadi yang lolos pengecekan `.exists()` di panggilan
    berikutnya."""
    from google.cloud import storage

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(str(tmp_path))
    tmp_path.rename(dest_path)


def _ensure_local_files(model_id: str) -> tuple[Path, Path]:
    """Pastikan `.onnx`+`.npz` model ini ada di MODEL_DIR lokal -- unduh
    dari GCS kalau belum ada DAN GCS_BUCKET dikonfigurasi. Kalau
    GCS_BUCKET kosong (dev/test lokal), murni cek file lokal saja."""
    onnx_path = MODEL_DIR / f"{model_id}.onnx"
    npz_path = MODEL_DIR / f"{model_id}_head.npz"

    if GCS_BUCKET:
        if not onnx_path.exists():
            _download_from_gcs(f"{model_id}.onnx", onnx_path)
        if not npz_path.exists():
            _download_from_gcs(f"{model_id}_head.npz", npz_path)

    if not onnx_path.exists() or not npz_path.exists():
        source = f"GCS bucket {GCS_BUCKET!r}" if GCS_BUCKET else f"{MODEL_DIR} (GCS_BUCKET tidak di-set)"
        raise FileNotFoundError(
            f"Artefak model '{model_id}' tidak ditemukan -- dicoba dari {source} "
            f"(butuh {onnx_path.name} + {npz_path.name})."
        )
    return onnx_path, npz_path


def get_model(model_id: str) -> ModelArtifact:
    """Ambil (atau unduh+load+cache) ModelArtifact untuk `model_id`. LRU
    murni: model paling lama tidak dipakai di-evict duluan kalau cache
    penuh (evict cuma melepas referensi dari memori, TIDAK menghapus
    file cache lokal -- load ulang berikutnya tidak perlu unduh ulang)."""
    if model_id not in MODEL_IDS:
        raise ValueError(f"model_id tidak dikenal: {model_id!r} (harus salah satu dari {MODEL_IDS})")

    if model_id in _cache:
        _cache.move_to_end(model_id)
        return _cache[model_id]

    if len(_cache) >= _MAX_LOADED:
        _cache.popitem(last=False)  # evict least-recently-used -- lepas referensi, GC urus sisanya

    onnx_path, npz_path = _ensure_local_files(model_id)
    artifact = ModelArtifact(model_id, onnx_path, npz_path)
    _cache[model_id] = artifact
    return artifact


def loaded_model_ids() -> list[str]:
    """Model yang sedang resident di cache -- dipakai /health atau debug, bukan kontrak publik spec Sec9."""
    return list(_cache.keys())
