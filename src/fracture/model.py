"""
Perakitan backbone + head — satu fungsi untuk keempat varian ConvNeXt.
HANYA backbone yang berbeda antar model; seluruh hyperparameter lain
dikunci di configs/base.yaml (fix F2: perbandingan arsitektur di
eksperimen lama tidak terkontrol karena LR/epoch/preprocessing beda-beda
per model).
"""

from tensorflow.keras import Model
from tensorflow.keras.applications import ConvNeXtBase, ConvNeXtLarge, ConvNeXtSmall, ConvNeXtTiny
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D

BACKBONES = {
    "tiny": ConvNeXtTiny,
    "small": ConvNeXtSmall,
    "base": ConvNeXtBase,
    "large": ConvNeXtLarge,
}

# Nama layer head eksplisit — dipakai unfreeze_last_stages() untuk membedakan
# backbone dari head TANPA butuh objek base_model terpisah. Ini penting untuk
# resume (spec §6.3): begitu model di-load ulang dari checkpoint via
# tf.keras.models.load_model(), referensi Python ke base_model yang asli
# hilang, tapi nama layer tetap ada di model.layers.
HEAD_LAYER_NAMES = {"gap", "feature_dense", "head_dropout", "prediction"}


def build_model(backbone_name: str, img_size: int = 224, dense_units: int = 512, dropout: float = 0.5):
    """Head: GAP -> Dense(512, gelu) -> Dropout -> Dense(1, sigmoid).

    Head sengaja dibuat sederhana (bentuk tertutup) — ini yang memungkinkan
    Grad-CAM dihitung analitik di NumPy murni saat ekspor ONNX nanti
    (spec §8), tanpa perlu TensorFlow penuh di server inference.
    """
    if backbone_name not in BACKBONES:
        raise ValueError(f"backbone_name harus salah satu dari {list(BACKBONES)}, dapat: {backbone_name!r}")

    backbone_cls = BACKBONES[backbone_name]
    base_model = backbone_cls(weights="imagenet", include_top=False, input_shape=(img_size, img_size, 3))
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D(name="gap")(x)
    x = Dense(dense_units, activation="gelu", name="feature_dense")(x)
    x = Dropout(dropout, name="head_dropout")(x)
    predictions = Dense(1, activation="sigmoid", name="prediction")(x)

    model = Model(inputs=base_model.input, outputs=predictions)
    return model


def unfreeze_last_stages(model, n_stages: int = 2, total_stages: int = 4) -> int:
    """Buka `n_stages` bagian TERAKHIR dari backbone, didekati lewat
    proporsi jumlah layer (bukan angka arbitrer seperti `fine_tune_from=50`
    di eksperimen lama — fix B2). ConvNeXt Keras tidak mengekspos batas
    stage lewat nama layer yang konsisten antar ukuran model, jadi proporsi
    adalah pendekatan paling konsisten lintas Tiny/Small/Base/Large.

    Beroperasi langsung di `model.layers` (bukan objek base_model terpisah)
    supaya tetap berfungsi setelah model di-load ulang dari checkpoint.
    Return: index layer backbone pertama yang dibuka (untuk logging).
    """
    backbone_layers = [layer for layer in model.layers if layer.name not in HEAD_LAYER_NAMES]
    total = len(backbone_layers)
    unfreeze_from = int(total * (1 - n_stages / total_stages))

    for i, layer in enumerate(backbone_layers):
        layer.trainable = i >= unfreeze_from

    return unfreeze_from
