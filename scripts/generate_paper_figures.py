"""
Figure PER-MODEL (bukan grid 2x2 spt scripts/generate_figures.py) untuk
menggantikan gambar confusion matrix & ROC curve yang SALAH (hasil eksperimen
lama, akurasi ~50%) di docs/LAPORAN-PENELITIAN-Bone-Fracture.docx dengan
hasil dari pipeline yang sudah diaudit (results/metrics.json). Dipakai oleh
scripts/revise_paper.py.

Jalankan: python scripts/generate_paper_figures.py
Output: results/figures/paper/{confusion,roc}_{model_id}.png
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
METRICS_PATH = REPO_ROOT / "results" / "metrics.json"
OUT_DIR = REPO_ROOT / "results" / "figures" / "paper"

MODEL_LABELS = {"tiny": "ConvNeXt-Tiny", "small": "ConvNeXt-Small", "base": "ConvNeXt-Base", "large": "ConvNeXt-Large"}
MODEL_COLORS = {"tiny": "#2a78d6", "small": "#eb6834", "base": "#1baf7a", "large": "#eda100"}

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 11,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "figure.dpi": 100,
    "savefig.dpi": 200,
})


def plot_confusion(m: dict) -> None:
    mid = m["model_id"]
    cm = m["confusion_matrix"]
    mat = np.array([[cm["tp"], cm["fn"]], [cm["fp"], cm["tn"]]])
    total = mat.sum()
    fig, ax = plt.subplots(figsize=(4.2, 4))
    ax.imshow(mat, cmap="Greys", vmin=0, vmax=mat.max())
    for i in range(2):
        for j in range(2):
            val = mat[i, j]
            pct = 100 * val / total
            color = "white" if val > mat.max() * 0.6 else "black"
            ax.text(j, i, f"{val}\n({pct:.1f}%)", ha="center", va="center", color=color, fontsize=11)
    ax.set_xticks([0, 1], ["Fractured", "Not Fractured"])
    ax.set_yticks([0, 1], ["Fractured", "Not Fractured"])
    ax.set_xlabel("Prediksi")
    ax.set_ylabel("Aktual")
    ax.set_title(f"Confusion Matrix {MODEL_LABELS[mid]}\n(test set, n={m['test_set_size']}, threshold Youden dari validasi)", fontsize=10)
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / f"confusion_{mid}.png", bbox_inches="tight")
    plt.close(fig)
    print(f"  paper/confusion_{mid}.png")


def plot_roc(m: dict) -> None:
    mid = m["model_id"]
    fig, ax = plt.subplots(figsize=(4.5, 4.2))
    ax.plot([0, 1], [0, 1], color="gray", linestyle=":", linewidth=1, label="Random (AUROC=0.5)")
    pts = m["roc_curve"]
    ax.plot(
        [p["fpr"] for p in pts], [p["tpr"] for p in pts],
        color=MODEL_COLORS[mid], linewidth=2,
        label=f"{MODEL_LABELS[mid]} (AUROC={m['auroc']['point']:.4f})",
    )
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"Kurva ROC {MODEL_LABELS[mid]}\n(test set, n={m['test_set_size']})", fontsize=10)
    ax.legend(loc="lower right", fontsize=8)
    fig.tight_layout()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_DIR / f"roc_{mid}.png", bbox_inches="tight")
    plt.close(fig)
    print(f"  paper/roc_{mid}.png")


def main():
    with open(METRICS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    models = sorted(data["models"], key=lambda m: ["tiny", "small", "base", "large"].index(m["model_id"]))
    print("Generating per-model figures for paper revision...")
    for m in models:
        plot_confusion(m)
        plot_roc(m)
    print("Selesai.")


if __name__ == "__main__":
    main()
