"""
Lazy-load + LRU cache untuk keempat model (spec §9: "Model di-lazy load
dengan LRU cache agar boot cepat dan penggunaan RAM terkendali."). Default
cuma 2 model resident sekaligus -- container 16 GB HF Space gratis tidak
perlu menampung keempat ConvNeXt (Tiny..Large) bersamaan setiap saat.
"""

import os
from collections import OrderedDict

from .config import MODEL_DIR, MODEL_IDS
from .inference import ModelArtifact

_MAX_LOADED = int(os.environ.get("MODEL_CACHE_SIZE", "2"))
_cache: "OrderedDict[str, ModelArtifact]" = OrderedDict()


def get_model(model_id: str) -> ModelArtifact:
    """Ambil (atau load+cache) ModelArtifact untuk `model_id`. LRU murni:
    model paling lama tidak dipakai di-evict duluan kalau cache penuh."""
    if model_id not in MODEL_IDS:
        raise ValueError(f"model_id tidak dikenal: {model_id!r} (harus salah satu dari {MODEL_IDS})")

    if model_id in _cache:
        _cache.move_to_end(model_id)
        return _cache[model_id]

    if len(_cache) >= _MAX_LOADED:
        _cache.popitem(last=False)  # evict least-recently-used -- lepas referensi, GC urus sisanya

    onnx_path = MODEL_DIR / f"{model_id}.onnx"
    npz_path = MODEL_DIR / f"{model_id}_head.npz"
    if not onnx_path.exists() or not npz_path.exists():
        raise FileNotFoundError(
            f"Artefak model '{model_id}' tidak ditemukan di {MODEL_DIR} "
            f"(butuh {onnx_path.name} + {npz_path.name})."
        )

    artifact = ModelArtifact(model_id, onnx_path, npz_path)
    _cache[model_id] = artifact
    return artifact


def loaded_model_ids() -> list[str]:
    """Model yang sedang resident di cache -- dipakai /health atau debug, bukan kontrak publik spec Sec9."""
    return list(_cache.keys())
