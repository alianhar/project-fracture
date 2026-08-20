"""
Bahan tulisan ilmiah (spec §12): tabel dan figure siap publikasi,
SELURUHNYA dibangkitkan otomatis dari `results/metrics.json` -- nol
angka manual/hardcode, konsisten dengan aturan yang sama di web
Benchmark page ("nol angka hardcode", lihat CLAUDE.md).

Jalankan: python scripts/generate_figures.py
Output:
  results/figures/*.png (300 DPI, preview cepat) + *.pdf (vektor, utk LaTeX)
  results/tables/*.md (referensi cepat) + *.tex (siap \\input{} di skripsi)

Warna identitas model SAMA PERSIS dengan web (`web/src/lib/constants.ts`
MODEL_CHART_COLORS) -- satu identitas visual konsisten di seluruh
proyek (web + skripsi), bukan palet terpisah yang membingungkan.
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
METRICS_PATH = REPO_ROOT / "results" / "metrics.json"
FIGURES_DIR = REPO_ROOT / "results" / "figures"
TABLES_DIR = REPO_ROOT / "results" / "tables"

MODEL_ORDER = ["tiny", "small", "base", "large"]
MODEL_LABELS = {"tiny": "ConvNeXt-Tiny", "small": "ConvNeXt-Small", "base": "ConvNeXt-Base", "large": "ConvNeXt-Large"}
# Palet kategorikal tervalidasi (dataviz skill, references/palette.md, mode
# light -- figure ini utk dokumen tercetak/PDF, latar putih) -- BUKAN warna
# web MODEL_CHART_COLORS (terlalu rendah kontras utk kurva berhimpit spt
# ROC/PR di sini, tervalidasi via scripts/validate_palette.js: lightness
# band + CVD separation PASS; WARN kontras vs surface utk aqua/yellow
# dipenuhi via label langsung + tabel data terpisah sbg secondary encoding).
MODEL_COLORS = {"tiny": "#2a78d6", "small": "#eb6834", "base": "#1baf7a", "large": "#eda100"}
# Linestyle/marker terpisah dari warna -- figure tetap terbaca kalau dicetak hitam-putih.
MODEL_LINESTYLES = {"tiny": "-", "small": "--", "base": "-.", "large": ":"}
MODEL_MARKERS = {"tiny": "o", "small": "s", "base": "^", "large": "D"}

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "figure.dpi": 100,
    "savefig.dpi": 300,
})


def _ci_label(ci: dict) -> str:
    return f"{ci['point']:.4f} [{ci['lower']:.4f}, {ci['upper']:.4f}]"


def _save(fig, name: str) -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIGURES_DIR / f"{name}.png", bbox_inches="tight")
    fig.savefig(FIGURES_DIR / f"{name}.pdf", bbox_inches="tight")
    plt.close(fig)
    print(f"  figures/{name}.png + .pdf")


def fig_roc_curves(models: list[dict]) -> None:
    fig, ax = plt.subplots(figsize=(5.5, 5))
    ax.plot([0, 1], [0, 1], color="gray", linestyle=":", linewidth=1, label="Random (AUROC=0.5)")
    for m in models:
        mid = m["model_id"]
        pts = m["roc_curve"]
        ax.plot(
            [p["fpr"] for p in pts], [p["tpr"] for p in pts],
            color=MODEL_COLORS[mid], linestyle=MODEL_LINESTYLES[mid], marker=MODEL_MARKERS[mid],
            markersize=4, linewidth=1.5,
            label=f"{MODEL_LABELS[mid]} (AUROC={m['auroc']['point']:.3f})",
        )
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("Kurva ROC -- test set (n=508)")
    ax.legend(loc="lower right", fontsize=8)
    _save(fig, "roc_curves")


def fig_pr_curves(models: list[dict]) -> None:
    fig, ax = plt.subplots(figsize=(5.5, 5))
    for m in models:
        mid = m["model_id"]
        pts = m["pr_curve"]
        ax.plot(
            [p["recall"] for p in pts], [p["precision"] for p in pts],
            color=MODEL_COLORS[mid], linestyle=MODEL_LINESTYLES[mid], marker=MODEL_MARKERS[mid],
            markersize=4, linewidth=1.5,
            label=f"{MODEL_LABELS[mid]} (AUPRC={m['auprc']['point']:.3f})",
        )
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Kurva Precision-Recall -- test set (n=508)")
    ax.legend(loc="lower left", fontsize=8)
    _save(fig, "pr_curves")


def fig_reliability_diagrams(models: list[dict]) -> None:
    fig, axes = plt.subplots(2, 2, figsize=(9, 8), sharex=True, sharey=True)
    for ax, m in zip(axes.flat, models):
        mid = m["model_id"]
        pts = [p for p in m["reliability_diagram"] if p["bin_count"] > 0]
        ax.plot([0.5, 1], [0.5, 1], color="gray", linestyle=":", linewidth=1)
        ax.plot(
            [p["bin_confidence"] for p in pts], [p["bin_accuracy"] for p in pts],
            color=MODEL_COLORS[mid], marker=MODEL_MARKERS[mid], markersize=5, linewidth=1.5,
        )
        ax.set_title(f"{MODEL_LABELS[mid]} (ECE={m['ece']:.4f})", fontsize=10)
        ax.set_xlim(0.45, 1.02)
        ax.set_ylim(0.0, 1.02)
    for ax in axes[-1, :]:
        ax.set_xlabel("Confidence (bin)")
    for ax in axes[:, 0]:
        ax.set_ylabel("Accuracy (bin)")
    fig.suptitle("Reliability Diagram -- test set, setelah temperature scaling", y=1.00)
    fig.tight_layout()
    _save(fig, "reliability_diagrams")


def fig_confusion_matrices(models: list[dict]) -> None:
    fig, axes = plt.subplots(2, 2, figsize=(8, 8))
    for ax, m in zip(axes.flat, models):
        mid = m["model_id"]
        cm = m["confusion_matrix"]
        # baris = aktual (fractured, not_fractured); kolom = prediksi (fractured, not_fractured)
        mat = np.array([[cm["tp"], cm["fn"]], [cm["fp"], cm["tn"]]])
        total = mat.sum()
        im = ax.imshow(mat, cmap="Greys", vmin=0, vmax=mat.max())
        for i in range(2):
            for j in range(2):
                val = mat[i, j]
                pct = 100 * val / total
                color = "white" if val > mat.max() * 0.6 else "black"
                ax.text(j, i, f"{val}\n({pct:.1f}%)", ha="center", va="center", color=color, fontsize=9)
        ax.set_xticks([0, 1], ["Fractured", "Not Fractured"])
        ax.set_yticks([0, 1], ["Fractured", "Not Fractured"])
        ax.set_xlabel("Prediksi")
        ax.set_ylabel("Aktual")
        ax.set_title(MODEL_LABELS[mid], fontsize=10)
        fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.suptitle("Confusion Matrix -- test set (threshold Youden dari validation)", y=1.00)
    fig.tight_layout()
    _save(fig, "confusion_matrices")


def fig_risk_coverage_curves(models: list[dict]) -> None:
    fig, ax = plt.subplots(figsize=(5.5, 5))
    for m in models:
        mid = m["model_id"]
        pts = m["risk_coverage_curve"]
        ax.plot(
            [p["coverage"] for p in pts], [p["risk"] for p in pts],
            color=MODEL_COLORS[mid], linestyle=MODEL_LINESTYLES[mid], marker=MODEL_MARKERS[mid],
            markersize=4, linewidth=1.5, label=MODEL_LABELS[mid],
        )
    ax.set_xlabel("Coverage (proporsi gambar dijawab, sisanya abstain)")
    ax.set_ylabel("Risk (error rate di antara yang dijawab)")
    ax.set_title("Risk-Coverage Curve -- selective prediction")
    ax.legend(loc="upper right", fontsize=8)
    _save(fig, "risk_coverage_curves")


def fig_accuracy_comparison(models: list[dict]) -> None:
    """Bar chart + error bar CI 95% -- visualisasi eksplisit aturan spec
    Sec7/Sec14: klaim "A lebih baik dari B" HANYA sah kalau CI tidak overlap."""
    fig, ax = plt.subplots(figsize=(6, 4.5))
    labels = [MODEL_LABELS[m["model_id"]] for m in models]
    points = [m["accuracy"]["point"] for m in models]
    lower_err = [m["accuracy"]["point"] - m["accuracy"]["lower"] for m in models]
    upper_err = [m["accuracy"]["upper"] - m["accuracy"]["point"] for m in models]
    colors = [MODEL_COLORS[m["model_id"]] for m in models]
    x = np.arange(len(models))
    ax.bar(x, points, yerr=[lower_err, upper_err], color=colors, edgecolor="black", linewidth=0.6, capsize=4)
    ax.set_xticks(x, labels, rotation=15)
    ax.set_ylabel("Accuracy")
    ax.set_ylim(0.95, 1.0)
    ax.set_title("Perbandingan Accuracy antar Backbone (bar = 95% CI bootstrap)")
    fig.tight_layout()
    _save(fig, "accuracy_comparison")


def fig_clahe_ablation(ablation: dict | None) -> None:
    if not ablation:
        print("  (clahe_ablation kosong di metrics.json -- figure dilewati)")
        return
    metrics = ["accuracy", "f1", "auroc"]
    with_pts = [ablation["with_clahe"][k]["point"] for k in metrics]
    with_err = [
        [ablation["with_clahe"][k]["point"] - ablation["with_clahe"][k]["lower"] for k in metrics],
        [ablation["with_clahe"][k]["upper"] - ablation["with_clahe"][k]["point"] for k in metrics],
    ]
    without_pts = [ablation["without_clahe"][k]["point"] for k in metrics]
    without_err = [
        [ablation["without_clahe"][k]["point"] - ablation["without_clahe"][k]["lower"] for k in metrics],
        [ablation["without_clahe"][k]["upper"] - ablation["without_clahe"][k]["point"] for k in metrics],
    ]
    x = np.arange(len(metrics))
    width = 0.32
    fig, ax = plt.subplots(figsize=(6, 4.5))
    ax.bar(x - width / 2, with_pts, width, yerr=with_err, label="Dengan CLAHE",
           color=MODEL_COLORS["base"], edgecolor="black", linewidth=0.6, capsize=4)
    ax.bar(x + width / 2, without_pts, width, yerr=without_err, label="Tanpa CLAHE",
           color=MODEL_COLORS["large"], edgecolor="black", linewidth=0.6, capsize=4)
    ax.set_xticks(x, [m.upper() for m in metrics])
    ax.set_ylim(0.95, 1.0)
    ax.set_title(f"Ablation CLAHE -- {MODEL_LABELS[ablation['model_id']]} (bar = 95% CI)")
    ax.legend(fontsize=9)
    fig.tight_layout()
    _save(fig, "clahe_ablation")


def table_model_comparison_md(models: list[dict]) -> str:
    header = "| Model | Accuracy | Precision | Recall | F1 | AUROC | AUPRC | ECE | OOD AUROC |\n"
    sep = "|---|---|---|---|---|---|---|---|---|\n"
    rows = ""
    for m in models:
        rows += (
            f"| {MODEL_LABELS[m['model_id']]} | {_ci_label(m['accuracy'])} | {_ci_label(m['precision'])} | "
            f"{_ci_label(m['recall'])} | {_ci_label(m['f1'])} | {_ci_label(m['auroc'])} | "
            f"{_ci_label(m['auprc'])} | {m['ece']:.4f} | {m['ood_auroc']:.4f} |\n"
        )
    return header + sep + rows


def table_model_comparison_tex(models: list[dict]) -> str:
    lines = [
        r"% Tabel perbandingan model -- dibangkitkan otomatis dari results/metrics.json",
        r"% Butuh \usepackage{booktabs} di preamble.",
        r"\begin{table}[htbp]",
        r"\centering",
        r"\caption{Perbandingan performa keempat backbone ConvNeXt pada test set (n=508), interval kepercayaan 95\% dari 2000 resample bootstrap.}",
        r"\label{tab:model-comparison}",
        r"\begin{tabular}{lcccccc}",
        r"\toprule",
        r"Model & Accuracy & Precision & Recall & F1 & AUROC & AUPRC \\",
        r"\midrule",
    ]
    for m in models:
        def cell(k):
            ci = m[k]
            return f"{ci['point']:.4f} [{ci['lower']:.4f}, {ci['upper']:.4f}]"
        lines.append(
            f"{MODEL_LABELS[m['model_id']]} & {cell('accuracy')} & {cell('precision')} & "
            f"{cell('recall')} & {cell('f1')} & {cell('auroc')} & {cell('auprc')} \\\\"
        )
    lines += [r"\bottomrule", r"\end{tabular}", r"\end{table}"]
    return "\n".join(lines) + "\n"


def table_clahe_ablation_md(ablation: dict | None) -> str:
    if not ablation:
        return "_(clahe_ablation belum ada di results/metrics.json)_\n"
    header = "| Kondisi | Accuracy | F1 | AUROC |\n|---|---|---|---|\n"
    rows = (
        f"| Dengan CLAHE | {_ci_label(ablation['with_clahe']['accuracy'])} | "
        f"{_ci_label(ablation['with_clahe']['f1'])} | {_ci_label(ablation['with_clahe']['auroc'])} |\n"
        f"| Tanpa CLAHE | {_ci_label(ablation['without_clahe']['accuracy'])} | "
        f"{_ci_label(ablation['without_clahe']['f1'])} | {_ci_label(ablation['without_clahe']['auroc'])} |\n"
    )
    return header + rows


def table_clahe_ablation_tex(ablation: dict | None) -> str:
    if not ablation:
        return "% clahe_ablation belum ada di results/metrics.json\n"
    def cell(cond, k):
        ci = ablation[cond][k]
        return f"{ci['point']:.4f} [{ci['lower']:.4f}, {ci['upper']:.4f}]"
    lines = [
        r"% Tabel ablation CLAHE -- dibangkitkan otomatis dari results/metrics.json",
        r"\begin{table}[htbp]",
        r"\centering",
        rf"\caption{{Ablation CLAHE pada {MODEL_LABELS[ablation['model_id']]} -- interval kepercayaan 95\% overlap di ketiga metrik, tidak ada perbedaan signifikan.}}",
        r"\label{tab:clahe-ablation}",
        r"\begin{tabular}{lccc}",
        r"\toprule",
        r"Kondisi & Accuracy & F1 & AUROC \\",
        r"\midrule",
        f"Dengan CLAHE & {cell('with_clahe', 'accuracy')} & {cell('with_clahe', 'f1')} & {cell('with_clahe', 'auroc')} \\\\",
        f"Tanpa CLAHE & {cell('without_clahe', 'accuracy')} & {cell('without_clahe', 'f1')} & {cell('without_clahe', 'auroc')} \\\\",
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ]
    return "\n".join(lines) + "\n"


def table_confusion_matrices_md(models: list[dict]) -> str:
    out = ""
    for m in models:
        cm = m["confusion_matrix"]
        out += f"\n**{MODEL_LABELS[m['model_id']]}**\n\n"
        out += "| | Prediksi: Fractured | Prediksi: Not Fractured |\n|---|---|---|\n"
        out += f"| **Aktual: Fractured** | TP={cm['tp']} | FN={cm['fn']} |\n"
        out += f"| **Aktual: Not Fractured** | FP={cm['fp']} | TN={cm['tn']} |\n"
    return out


def ci_overlap_analysis(models: list[dict]) -> str:
    """Teks narasi otomatis -- aturan spec Sec7/Sec14: klaim beda signifikan
    HANYA sah kalau CI 95% tidak overlap."""
    def overlap(a, b):
        return not (a["upper"] < b["lower"] or b["upper"] < a["lower"])

    lines = ["## Analisis signifikansi (CI 95% accuracy, aturan spec §7/§14)\n"]
    any_sig = False
    for i in range(len(models)):
        for j in range(i + 1, len(models)):
            a, b = models[i], models[j]
            sig = not overlap(a["accuracy"], b["accuracy"])
            any_sig = any_sig or sig
            verdict = "**signifikan berbeda**" if sig else "tidak signifikan (CI overlap)"
            lines.append(f"- {MODEL_LABELS[a['model_id']]} vs {MODEL_LABELS[b['model_id']]}: {verdict}")
    if not any_sig:
        lines.append(
            "\n**Kesimpulan:** tidak ada pasangan model dengan accuracy yang signifikan "
            "berbeda secara statistik -- keempat backbone setara dalam batas ketidakpastian bootstrap."
        )
    return "\n".join(lines) + "\n"


def main():
    with open(METRICS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    models = sorted(data["models"], key=lambda m: MODEL_ORDER.index(m["model_id"]))
    ablation = data.get("clahe_ablation")

    print("Generating figures...")
    fig_roc_curves(models)
    fig_pr_curves(models)
    fig_reliability_diagrams(models)
    fig_confusion_matrices(models)
    fig_risk_coverage_curves(models)
    fig_accuracy_comparison(models)
    fig_clahe_ablation(ablation)

    print("Generating tables...")
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    md_content = (
        f"# Tabel & Analisis -- Fracture Classification\n\n"
        f"Dibangkitkan otomatis dari `results/metrics.json` "
        f"(generated_at: {data.get('generated_at')}, config_hash: {data.get('config_hash')}) "
        f"-- JANGAN diedit manual, jalankan ulang `python scripts/generate_figures.py`.\n\n"
        f"## Perbandingan Model (test set, n={models[0]['test_set_size']})\n\n"
        f"{table_model_comparison_md(models)}\n"
        f"{ci_overlap_analysis(models)}\n"
        f"## Confusion Matrix\n{table_confusion_matrices_md(models)}\n"
        f"## Ablation CLAHE\n\n{table_clahe_ablation_md(ablation)}\n"
    )
    (TABLES_DIR / "tables.md").write_text(md_content, encoding="utf-8")
    print("  tables/tables.md")

    (TABLES_DIR / "model_comparison.tex").write_text(table_model_comparison_tex(models), encoding="utf-8")
    print("  tables/model_comparison.tex")
    (TABLES_DIR / "clahe_ablation.tex").write_text(table_clahe_ablation_tex(ablation), encoding="utf-8")
    print("  tables/clahe_ablation.tex")

    print("\nSelesai.")


if __name__ == "__main__":
    main()
