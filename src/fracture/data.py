"""
SATU-SATUNYA definisi preprocessing (spec §4) — diimpor oleh notebook
training DAN backend inference (`api/inference.py`). Cacat F1 di
eksperimen lama (`data experiment/`) terjadi karena preprocessing
ditulis ulang di banyak tempat berbeda dengan nilai berbeda
(rescale=1./255 di train/val, tapi preprocess_input ConvNeXt — yang
ternyata no-op — di test). Modul ini mencegah itu terulang: hanya ADA
SATU jalur preprocessing.

TensorFlow DAN pandas SENGAJA tidak diimpor di level modul ini -- backend
`api/` butuh `preprocess_image()`/`IMG_SIZE`/`CLASS_NAMES` TANPA
keduanya (spec §8: image Docker ~400MB, bukan ~3GB -- ketahuan lewat
ModuleNotFoundError: No module named 'pandas' saat deploy Cloud Run
pertama, pandas kelewat waktu TF dijadikan lazy). Fungsi yang benar-benar
butuh TF/pandas (`manifest_to_dataframe`, `compute_class_weight`,
`make_generators` -- dipakai notebook training/evaluasi saja) meng-import
keduanya secara lazy di dalam fungsinya sendiri.

`from __future__ import annotations` WAJIB di sini -- supaya type hint
`pd.DataFrame` di signature `manifest_to_dataframe` tidak dievaluasi saat
modul di-import (Python biasanya evaluasi annotation saat definisi
fungsi, bukan saat dipanggil -- itu yang bikin `import pandas` di level
modul "menular" ke pemanggil yang cuma butuh preprocess_image()).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

IMG_SIZE = 224
CLASS_NAMES = ("fractured", "not_fractured")  # urutan alfabetis = class_indices Keras


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """
    ConvNeXt native: input [0,255] mentah, TANPA rescale=1./255.

    TIDAK memanggil tensorflow.keras.applications.convnext.preprocess_input
    secara langsung -- meski itulah definisi resminya -- supaya fungsi ini
    (dipakai backend `api/inference.py`) tidak memaksa TensorFlow ter-install.
    AMAN karena preprocess_input ConvNeXt di Keras adalah identity murni
    (`return x`) -- normalisasi ConvNeXt sudah jadi Normalization layer DI
    DALAM arsitektur model itu sendiri, bukan di preprocessing eksternal
    (beda dari ResNet/VGG dkk yang preprocess_input-nya benar-benar
    melakukan sesuatu). Kalau asumsi ini pernah salah (mis. Keras versi
    baru mengubah perilaku), `verify_prob_parity()` di
    src/fracture/export_onnx.py akan menangkapnya (selisih ONNX vs Keras
    >= 1e-4) -- bukan klaim tanpa jaring pengaman.

    Yang penting: TIDAK ADA rescale apa pun di sini, beda dengan bug F1 di
    eksperimen lama (rescale=1./255 di train/val, preprocess_input konstan
    di test).
    """
    return np.asarray(img, dtype=np.float32)


def load_manifest(manifest_path: str | Path) -> dict:
    with open(manifest_path, encoding="utf-8") as f:
        return json.load(f)


def manifest_to_dataframe(manifest_path: str | Path, dataset_root: str | Path) -> pd.DataFrame:
    """split_manifest.json -> DataFrame flat (filename, class, split).

    Sumber kebenaran split SEKARANG adalah manifest ini — BUKAN struktur
    folder train/val/test asli dari Kaggle, yang terbukti bocor 34.84%
    (lihat results/audit_report.json). Satu baris = satu gambar KANONIK
    (representasi klaster duplikat/near-duplikat, sudah dideduplikasi).

    `canonical_path` di manifest RELATIF terhadap dataset_root (portable
    lintas lokal <-> Colab Drive, path-nya beda: lihat manifest['dataset_root']
    untuk catatan) — `dataset_root` WAJIB diberikan eksplisit di sini,
    bukan diasumsikan dari manifest.
    """
    import pandas as pd  # lazy -- lihat docstring modul

    manifest = load_manifest(manifest_path)
    dataset_root = Path(dataset_root)
    rows = [
        {
            "filename": str(dataset_root / c["canonical_path"]),
            "class": c["class"],
            "split": c["assigned_split"],
        }
        for c in manifest["clusters"]
    ]
    return pd.DataFrame(rows)


def compute_class_weight(manifest_path: str | Path, dataset_root: str | Path) -> dict[int, float]:
    """Kelas train imbalanced (~41.7% fractured / 58.3% not_fractured per
    audit) — dipakai sebagai `class_weight=` di model.fit()."""
    df = manifest_to_dataframe(manifest_path, dataset_root)
    train_df = df[df["split"] == "train"]
    classes = sorted(train_df["class"].unique())  # alfabetis, cocok class_indices
    counts = train_df["class"].value_counts()
    total = len(train_df)
    n_classes = len(classes)
    weights = {i: total / (n_classes * counts[c]) for i, c in enumerate(classes)}
    return weights


def make_generators(
    manifest_path: str | Path,
    dataset_root: str | Path,
    img_size: int = IMG_SIZE,
    batch_size: int = 16,
    seed: int = 42,
    augment_train: dict | None = None,
    use_clahe: bool = False,
):
    """Generator train/val/test dari split_manifest.json.

    val & test SELALU tanpa augmentasi dan shuffle=False (fix F5 — di
    eksperimen lama Small, val_gen dibuat dari datagen yang sama dengan
    train, ikut teraugmentasi dan tidak di-shuffle=False).

    `use_clahe` -- spec §11 ablation (Base saja, lihat CLAUDE.md). Kalau
    True, CLAHE diterapkan SEBELUM preprocess_image(), konsisten di
    train/val/test (bukan cuma train) sesuai spec §11. Default False --
    TIDAK mengubah perilaku training 4 model utama yang sudah selesai.
    """
    from tensorflow.keras.preprocessing.image import ImageDataGenerator  # lazy -- lihat docstring modul

    if use_clahe:
        from .clahe import apply_clahe

        def _preprocessing_function(img):
            return preprocess_image(apply_clahe(img))
    else:
        _preprocessing_function = preprocess_image

    augment_train = augment_train or {}
    df = manifest_to_dataframe(manifest_path, dataset_root)

    train_datagen = ImageDataGenerator(
        preprocessing_function=_preprocessing_function,
        rotation_range=augment_train.get("rotation_range", 15),
        zoom_range=augment_train.get("zoom_range", 0.15),
        horizontal_flip=augment_train.get("horizontal_flip", True),
    )
    eval_datagen = ImageDataGenerator(preprocessing_function=_preprocessing_function)

    common = dict(x_col="filename", y_col="class", target_size=(img_size, img_size),
                  batch_size=batch_size, class_mode="binary")

    train_gen = train_datagen.flow_from_dataframe(
        df[df["split"] == "train"], shuffle=True, seed=seed, **common
    )
    val_gen = eval_datagen.flow_from_dataframe(
        df[df["split"] == "val"], shuffle=False, **common
    )
    test_gen = eval_datagen.flow_from_dataframe(
        df[df["split"] == "test"], shuffle=False, **common
    )
    return train_gen, val_gen, test_gen
