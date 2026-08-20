# Figure & Tabel Publikasi (spec §12)

Seluruh isi `results/figures/` dan `results/tables/` **dibangkitkan otomatis**
dari `results/metrics.json` oleh `scripts/generate_figures.py` -- jangan diedit
manual. Untuk regenerasi (mis. setelah `results/metrics.json` berubah):

```bash
pip install matplotlib numpy
python scripts/generate_figures.py
```

## Isi

- `roc_curves.png/.pdf` -- kurva ROC keempat backbone, test set (n=508)
- `pr_curves.png/.pdf` -- kurva Precision-Recall
- `reliability_diagrams.png/.pdf` -- kalibrasi (setelah temperature scaling), 2x2 per model
- `confusion_matrices.png/.pdf` -- confusion matrix pada threshold Youden (dari validation)
- `risk_coverage_curves.png/.pdf` -- selective prediction (abstain vs risk)
- `accuracy_comparison.png/.pdf` -- bar chart accuracy + CI 95%, visualisasi aturan spec §7/§14
- `clahe_ablation.png/.pdf` -- ablation CLAHE (ConvNeXt-Base saja, spec §11)

`.png` untuk pratinjau cepat/web, `.pdf` (vektor) untuk `\includegraphics{}` di
dokumen LaTeX -- tidak pecah saat di-scale.

Tabel terkait ada di `results/tables/` (`tables.md` referensi cepat + narasi
analisis signifikansi, `model_comparison.tex`/`clahe_ablation.tex` siap
`\input{}`, butuh `\usepackage{booktabs}`).

## Palet warna

Identitas model (Tiny=biru, Small=oranye, Base=aqua, Large=kuning) memakai
palet kategorikal tervalidasi dari skill `dataviz` (BUKAN `MODEL_CHART_COLORS`
di `web/` -- itu untuk UI gelap, kontrasnya terlalu rendah untuk kurva
berhimpit di figure statis/tercetak). Linestyle & marker juga dibedakan per
model supaya tetap terbaca kalau dicetak hitam-putih.
