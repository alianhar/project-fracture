"""
Ekspor ONNX + ekstraksi bobot head (spec §8).

Desain: ONNX model HANYA output [prob, featmap] -- backbone CNN saja, yang
mahal secara komputasi dan butuh runtime ONNX. Bobot head (Dense-512 +
Dense-1, dua matriks kecil) diekspor TERPISAH sebagai .npz, supaya
Grad-CAM (gradcam.py) & OOD (ood.py) bisa dihitung di NumPy murni di
server tanpa TensorFlow -- head Dense+gelu+Dense+sigmoid terlalu murah
secara komputasi untuk butuh graph ONNX sendiri, dan menyimpannya sebagai
matriks polos membuat matematika analitik gradcam.py/ood.py bisa langsung
dipakai (server tinggal: g = featmap.mean(axis=(0,1)); z = g @ w1 + b1).

`featmap` = input ke layer 'gap' (GlobalAveragePooling2D) -- yaitu output
stage terakhir backbone, SEBELUM di-GAP. Nama layer 'gap' konsisten di
keempat backbone (lihat model.py), jadi fungsi ini bekerja sama untuk
Tiny/Small/Base/Large tanpa cabang kode per-model.
"""

from pathlib import Path

import numpy as np
import tensorflow as tf


def build_export_model(model: tf.keras.Model) -> tf.keras.Model:
    """Model 2-output: [prob, featmap]."""
    featmap = model.get_layer("gap").input
    prob = model.output
    return tf.keras.Model(inputs=model.input, outputs=[prob, featmap], name="export_model")


def extract_head_weights(model: tf.keras.Model) -> dict:
    """Bobot Dense-512 (w1,b1) dan Dense-1 (w2,b2) -- w2 di-squeeze dari
    (512,1) ke (512,) supaya langsung cocok dengan gradcam.py/ood.py."""
    w1, b1 = model.get_layer("feature_dense").get_weights()
    w2, b2 = model.get_layer("prediction").get_weights()
    return {"w1": w1, "b1": b1, "w2": w2.squeeze(axis=-1), "b2": float(b2[0])}


def export_to_onnx(model: tf.keras.Model, output_path: str, img_size: int = 224, opset: int = 13):
    """Butuh `tf2onnx` terpasang (bukan default Colab -- `!pip install tf2onnx`).

    Konversi lewat SavedModel round-trip (export ke disk, baru tf2onnx baca
    dari situ) -- BUKAN `tf2onnx.convert.from_keras()` langsung ke objek
    model in-memory. ConvNeXt punya custom depthwise-conv layer yang
    ke-wrap jadi subgraph `tf.function` (StatefulPartitionedCall) saat
    dikonversi langsung dari objek Keras; tf2onnx tidak bisa "lihat ke
    dalam" wrapper itu. Export+reload SavedModel memaksa TF meratakan
    graph sepenuhnya sebelum tf2onnx membacanya.
    """
    import tempfile

    import tf2onnx

    export_model = build_export_model(model)
    spec = (tf.TensorSpec((None, img_size, img_size, 3), tf.float32, name="input"),)

    with tempfile.TemporaryDirectory() as tmp_dir:
        export_model.export(tmp_dir)  # SavedModel format (Keras 3) -- meratakan graph
        tf2onnx.convert.from_saved_model(tmp_dir, input_signature=spec, opset=opset, output_path=output_path)
    return export_model


def save_head_artifacts(path: str, weights: dict, extra: dict | None = None) -> None:
    """Simpan bobot head + parameter tambahan (temperature kalibrasi,
    threshold terpilih, mean/inv_cov Mahalanobis OOD) ke satu .npz --
    companion WAJIB untuk file .onnx (tidak berguna sendirian)."""
    payload = dict(weights)
    if extra:
        for k, v in extra.items():
            payload[k] = np.asarray(v)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, **payload)


def verify_prob_parity(keras_model: tf.keras.Model, onnx_path: str, sample_batch: np.ndarray, atol: float = 1e-4) -> float:
    """Bandingkan output `prob` ONNX vs Keras asli pada satu batch sampel --
    selisih absolut maksimum HARUS < atol (spec §8). Return selisih maksimum
    (raise AssertionError kalau melampaui atol).

    Catatan: verifikasi parity Grad-CAM (analitik vs GradientTape) sengaja
    TIDAK ditaruh di sini -- itu butuh TensorFlow GradientTape di sisi
    Keras sekaligus fungsi gradcam.py di sisi NumPy, lebih pas ditulis
    langsung di notebook evaluasi (03_evaluate_export.ipynb) di mana kedua
    dunia itu sudah hidup berdampingan.
    """
    import onnxruntime as ort

    keras_prob = keras_model.predict(sample_batch, verbose=0).squeeze(axis=-1)

    session = ort.InferenceSession(onnx_path)
    input_name = session.get_inputs()[0].name
    onnx_outputs = session.run(None, {input_name: sample_batch.astype(np.float32)})
    # Urutan output mengikuti urutan `outputs=[prob, featmap]` di build_export_model
    onnx_prob = onnx_outputs[0].squeeze(axis=-1)

    max_diff = float(np.max(np.abs(keras_prob - onnx_prob)))
    assert max_diff < atol, f"Parity ONNX vs Keras gagal: selisih maksimum {max_diff} >= {atol}"
    return max_diff
