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

_TFL_GELU_REGISTERED = False


def _register_tfl_gelu_handler() -> None:
    """Registrasi custom op handler tf2onnx untuk `TFL_GELU`.

    TFLite men-fuse GELU eksak ConvNeXt jadi builtin op `TFL_GELU` yang
    tf2onnx tidak kenal -- akar masalah yang sama sejak awal (`Erfc`, ONNX
    tidak punya op itu), cuma sekarang namanya beda karena sudah lewat
    fusion pass TFLite. Diganti jadi dekomposisi `Erf` standar
    (`0.5*x*(1+erf(x/sqrt(2)))`) -- SAMA PERSIS secara matematis (bukan
    aproksimasi tanh), karena `Erf` DIDUKUNG ONNX sejak opset 9 (beda dari
    `Erfc` yang tidak pernah ada di spesifikasi ONNX).

    CATATAN JUJUR: pola registrasi decorator `@tf_op(...)` + `ctx.make_node`/
    `ctx.make_const`/`ctx.remove_node` ini konsisten dengan cara tf2onnx
    mendaftarkan konverter bawaannya sendiri (dipakai di seluruh
    tf2onnx/onnx_opset/*.py) -- tapi BELUM PERNAH diverifikasi jalan
    terhadap versi tf2onnx yang ke-install (1.17.0). Kalau signature/nama
    method salah, error yang muncul akan jelas (TypeError/AttributeError
    saat konversi) -- paste traceback-nya, jangan asumsikan ini pasti benar.

    Idempotent: registrasi cuma sekali per proses (flag modul-level) --
    aman dipanggil ulang tiap iterasi loop 4 backbone di notebook.
    """
    global _TFL_GELU_REGISTERED
    if _TFL_GELU_REGISTERED:
        return

    from tf2onnx import utils
    from tf2onnx.handler import tf_op

    @tf_op("TFL_GELU")
    class TflGelu:
        @classmethod
        def version_9(cls, ctx, node, **kwargs):  # opset minimum utk op Erf
            x = node.input[0]
            dtype = ctx.get_dtype(node.output[0])
            shape = ctx.get_shape(node.output[0])

            sqrt2 = ctx.make_const(utils.make_name("gelu_sqrt2"), np.array(1.4142135, dtype=np.float32))
            div_node = ctx.make_node("Div", [x, sqrt2.output[0]])
            erf_node = ctx.make_node("Erf", [div_node.output[0]])
            one_const = ctx.make_const(utils.make_name("gelu_one"), np.array(1.0, dtype=np.float32))
            add_node = ctx.make_node("Add", [erf_node.output[0], one_const.output[0]])
            half_const = ctx.make_const(utils.make_name("gelu_half"), np.array(0.5, dtype=np.float32))
            mul_half_node = ctx.make_node("Mul", [add_node.output[0], half_const.output[0]])

            ctx.remove_node(node.name)
            ctx.make_node(
                "Mul", [x, mul_half_node.output[0]],
                name=node.name, outputs=node.output, shapes=[shape], dtypes=[dtype],
            )

    _TFL_GELU_REGISTERED = True


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


def export_to_onnx(model: tf.keras.Model, output_path: str, img_size: int = 224, opset: int = 18):
    """Butuh `tf2onnx` terpasang (bukan default Colab -- `!pip install tf2onnx`).

    RIWAYAT (3 pendekatan GAGAL sebelum ini, semua lewat jalur TF-graph
    langsung ke tf2onnx -- `from_keras()`, SavedModel+CLI, freeze manual
    `convert_variables_to_constants_v2(aggressive_inlining=True)`): semua
    mentok identik di StatefulPartitionedCall untuk tiap depthwise-conv
    ConvNeXt. Ini bukti kuat depthwise-conv ConvNeXt dibungkus fungsi yang
    SECARA STRUKTURAL tidak bisa di-inline oleh optimizer graph TF apa
    pun (kemungkinan `@tf.custom_gradient`) -- freeze lebih agresif tidak
    akan pernah menembus ini, tf2onnx.tfonnx (graph walker TF native) itu
    sendiri yang tidak sanggup.

    Fix (pendekatan ke-4, pivot arsitektur bukan sekadar freeze lagi):
    konversi lewat PERANTARA TFLite (`TF -> TFLite -> ONNX`), BUKAN
    langsung TF graph -> ONNX. Konverter TFLite (berbasis MLIR) jauh
    lebih matang dalam meng-inline fungsi custom-gradient/StatefulPartitionedCall
    dibanding graph walker tf2onnx sendiri -- ini pipeline konversi yang
    BENAR-BENAR BEDA, bukan variasi dari 3 percobaan sebelumnya.

    Efek samping dari fusion TFLite: GELU eksak jadi builtin `TFL_GELU`
    (bukan `Erfc` mentah tersebar di banyak posisi graph) -- tf2onnx TETAP
    tidak kenal op itu, tapi karena sekarang jadi SATU op atomik yang
    well-defined, ditangani lewat custom op handler
    (`_register_tfl_gelu_handler()`) yang mengganti `TFL_GELU` jadi
    dekomposisi `Erf` standar -- SAMA PERSIS secara matematis, bukan
    aproksimasi, karena `Erf` didukung ONNX (beda dari `Erfc`).

    TFLiteConverter default TIDAK melakukan kuantisasi (float32 murni) --
    `converter.optimizations` sengaja TIDAK di-set, supaya presisi untuk
    verifikasi parity (<1e-4) tidak rusak oleh kuantisasi.
    """
    import tempfile

    import tf2onnx

    _register_tfl_gelu_handler()

    export_model = build_export_model(model)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tflite_path = f"{tmp_dir}/model.tflite"

        converter = tf.lite.TFLiteConverter.from_keras_model(export_model)
        # TIDAK set converter.optimizations -- default = float32 murni, tanpa kuantisasi.
        tflite_model = converter.convert()
        with open(tflite_path, "wb") as f:
            f.write(tflite_model)

        tf2onnx.convert.from_tflite(tflite_path, output_path=output_path, opset=opset)

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
