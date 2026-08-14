"""
Training dua fase (frozen -> fine-tune) dengan checkpoint tiap epoch dan
resume otomatis (spec §6.3) — Colab gratis bisa terputus kapan saja di
tengah training ~4-5 jam, dan restart dari nol berarti kehilangan
berjam-jam compute.

Kontrak resume: setiap run punya folder `runs/<run_id>/` berisi
`latest.keras` (disimpan tiap epoch, dipakai untuk resume) dan
`best.keras` (val_loss terbaik, dipakai untuk evaluasi final) beserta
`status.json` yang diperbarui SETELAH SETIAP EPOCH (bukan cuma setelah
fit() selesai) — supaya kalau proses mati mendadak di tengah epoch ke-N
(disconnect Colab), resume tahu persis epoch terakhir yang benar-benar
selesai, bukan menebak dari epoch budget yang direncanakan.
"""

import json
from pathlib import Path

import tensorflow as tf
from tensorflow.keras.callbacks import Callback, CSVLogger, EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam

from .model import build_model, unfreeze_last_stages


class _StatusCallback(Callback):
    """Tulis status.json setelah SETIAP epoch selesai — sumber kebenaran
    resume, tidak bergantung pada fit() selesai bersih."""

    def __init__(self, run_dir: Path, phase: str, initial_epoch: int):
        super().__init__()
        self.run_dir = run_dir
        self.phase = phase
        self.initial_epoch = initial_epoch
        self.stopped_early = False

    def on_epoch_end(self, epoch, logs=None):
        # `epoch` dari Keras berbasis-0 dan sudah memperhitungkan initial_epoch
        completed = epoch + 1
        _write_status(self.run_dir, {"phase": self.phase, "completed_epochs": completed})

    def on_train_end(self, logs=None):
        if self.model.stop_training:
            self.stopped_early = True


def _read_status(run_dir: Path) -> dict:
    status_path = run_dir / "status.json"
    if status_path.exists():
        return json.loads(status_path.read_text())
    return {"phase": "phase1", "completed_epochs": 0}


def _write_status(run_dir: Path, status: dict) -> None:
    (run_dir / "status.json").write_text(json.dumps(status, indent=2))


def _make_callbacks(run_dir: Path, config: dict, phase: str, initial_epoch: int):
    es_cfg = config["callbacks"]["early_stopping"]
    rlrop_cfg = config["callbacks"]["reduce_lr"]
    status_cb = _StatusCallback(run_dir, phase, initial_epoch)
    callbacks = [
        EarlyStopping(
            monitor=es_cfg["monitor"], patience=es_cfg["patience"],
            restore_best_weights=es_cfg["restore_best_weights"],
        ),
        ModelCheckpoint(str(run_dir / "best.keras"), monitor="val_loss", save_best_only=True),
        ModelCheckpoint(str(run_dir / "latest.keras"), save_best_only=False),
        ReduceLROnPlateau(monitor=rlrop_cfg["monitor"], patience=rlrop_cfg["patience"], factor=rlrop_cfg["factor"]),
        CSVLogger(str(run_dir / f"history_{phase}.csv"), append=True),
        status_cb,
    ]
    return callbacks, status_cb


def run_training(backbone_name: str, train_gen, val_gen, class_weight: dict | None, run_dir: str, config: dict):
    """Latih satu model dari config terkunci. Aman dipanggil ulang untuk
    resume — baca status.json di run_dir, lanjut dari epoch & fase
    terakhir yang benar-benar tersimpan (bukan asumsi epoch budget penuh).

    EarlyStopping yang berhenti sebelum epoch budget habis DIANGGAP fase
    selesai (lanjut ke fase berikutnya) — itu memang sinyal training sudah
    konvergen, bukan interupsi yang perlu dilanjutkan.
    """
    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    status = _read_status(run_dir)

    latest_ckpt = run_dir / "latest.keras"
    if latest_ckpt.exists():
        print(f"[{backbone_name}] Resume: {latest_ckpt} (fase={status['phase']}, epoch selesai={status['completed_epochs']})")
        model = tf.keras.models.load_model(latest_ckpt)
    else:
        print(f"[{backbone_name}] Mulai dari ImageNet weights.")
        model = build_model(backbone_name, img_size=config["img_size"])

    p1, p2 = config["phase1"], config["phase2"]

    # ===== Fase 1: backbone beku =====
    if status["phase"] == "phase1" and status["completed_epochs"] < p1["epochs"]:
        model.compile(optimizer=Adam(learning_rate=p1["lr"]), loss="binary_crossentropy", metrics=["accuracy"])
        callbacks, status_cb = _make_callbacks(run_dir, config, "phase1", status["completed_epochs"])
        model.fit(
            train_gen, validation_data=val_gen,
            initial_epoch=status["completed_epochs"], epochs=p1["epochs"],
            class_weight=class_weight, callbacks=callbacks, verbose=1,
        )
        # EarlyStopping atau selesai natural -- keduanya berarti fase1 tuntas,
        # lanjut ke transisi fase2 di bawah (bukan mengulang fase1).
        status = _read_status(run_dir)
        status["phase"] = "phase1_done"
        _write_status(run_dir, status)

    # ===== Transisi fase1 -> fase2: unfreeze + recompile =====
    if status["phase"] in ("phase1_done",):
        unfreeze_from = unfreeze_last_stages(model, n_stages=p2["unfreeze_last_stages"])
        print(f"[{backbone_name}] Unfreeze dari layer backbone index {unfreeze_from}")
        status = {"phase": "phase2", "completed_epochs": p1["epochs"]}
        _write_status(run_dir, status)

    # ===== Fase 2: fine-tune =====
    total_epochs = p1["epochs"] + p2["epochs"]
    if status["phase"] == "phase2" and status["completed_epochs"] < total_epochs:
        # Recompile wajib setiap resume di fase2 (trainable flags perlu
        # ter-apply ulang ke optimizer state setelah load_model).
        model.compile(optimizer=Adam(learning_rate=p2["lr"]), loss="binary_crossentropy", metrics=["accuracy"])
        callbacks, status_cb = _make_callbacks(run_dir, config, "phase2", status["completed_epochs"])
        model.fit(
            train_gen, validation_data=val_gen,
            initial_epoch=status["completed_epochs"], epochs=total_epochs,
            class_weight=class_weight, callbacks=callbacks, verbose=1,
        )
        status = _read_status(run_dir)
        status["phase"] = "done"
        _write_status(run_dir, status)

    print(f"[{backbone_name}] Selesai. Model terbaik: {run_dir / 'best.keras'}")
    return run_dir / "best.keras"
