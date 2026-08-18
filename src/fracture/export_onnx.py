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

    RIWAYAT (kenapa bukan from_keras()/SavedModel langsung): baik
    `tf2onnx.convert.from_keras()` langsung ke objek model in-memory MAUPUN
    round-trip lewat SavedModel (`export_model.export()` + CLI) sama-sama
    gagal dengan error identik -- StatefulPartitionedCall (di tiap
    depthwise-conv ConvNeXt) tidak bisa dibongkar tf2onnx. Ini membuktikan
    masalahnya BUKAN soal jalur masuknya, tapi proses freeze/inline
    bawaan tf2onnx tidak cukup agresif untuk subgraph tf.function yang
    dipakai ConvNeXt.

    Fix: freeze graph MANUAL pakai `convert_variables_to_constants_v2(...,
    aggressive_inlining=True)` -- API TF resmi yang secara eksplisit
    meng-inline nested tf.function call (bukan cuma ganti Variable jadi
    Constant seperti freeze biasa) -- baru serahkan GraphDef yang sudah
    beku itu ke `tf2onnx.convert.from_graph_def()` (bukan from_keras()).

    CATATAN: ini HANYA menangani StatefulPartitionedCall. Erfc (GELU
    eksak ConvNeXt, ONNX tidak punya op itu) adalah masalah TERPISAH yang
    kemungkinan besar masih akan muncul setelah fix ini -- assert di
    bawah akan bunyi eksplisit kalau itu terjadi, jangan diabaikan.
    """
    import tf2onnx
    from tensorflow.python.framework.convert_to_constants import convert_variables_to_constants_v2

    export_model = build_export_model(model)
    input_spec = tf.TensorSpec((None, img_size, img_size, 3), tf.float32, name="input")

    @tf.function(input_signature=[input_spec])
    def _serving_fn(x):
        return export_model(x)

    concrete_func = _serving_fn.get_concrete_function()
    frozen_func = convert_variables_to_constants_v2(concrete_func, aggressive_inlining=True)
    graph_def = frozen_func.graph.as_graph_def()

    input_names = [t.name for t in frozen_func.inputs]
    output_names = [t.name for t in frozen_func.outputs]

    tf2onnx.convert.from_graph_def(
        graph_def,
        input_names=input_names,
        output_names=output_names,
        opset=opset,
        output_path=output_path,
    )

    # Verifikasi LANGSUNG di sini, bukan cuma nunggu verify_prob_parity nanti --
    # tf2onnx bisa "berhasil" tanpa exception (op tidak didukung dilaporkan
    # lewat logging ERROR, bukan exception) sementara graph tetap tidak
    # bisa di-load onnxruntime. Gagal cepat & jelas di titik ini.
    import onnxruntime as ort

    ort.InferenceSession(output_path)
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
