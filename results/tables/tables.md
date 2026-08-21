# Tabel & Analisis -- Fracture Classification

Dibangkitkan otomatis dari `results/metrics.json` (generated_at: 2026-08-20T22:56:55.746801+00:00, config_hash: 84579a6b) -- JANGAN diedit manual, jalankan ulang `python scripts/generate_figures.py`.

## Perbandingan Model (test set, n=508)

| Model | Accuracy | Precision | Recall | F1 | AUROC | AUPRC | ECE | OOD AUROC |
|---|---|---|---|---|---|---|---|---|
| ConvNeXt-Tiny | 0.9862 [0.9764, 0.9961] | 0.9767 [0.9552, 0.9953] | 0.9906 [0.9764, 1.0000] | 0.9836 [0.9710, 0.9949] | 0.9986 [0.9960, 1.0000] | 0.9984 [0.9955, 0.9999] | 0.0168 | 0.9992 |
| ConvNeXt-Small | 0.9882 [0.9783, 0.9961] | 0.9858 [0.9679, 1.0000] | 0.9858 [0.9679, 1.0000] | 0.9858 [0.9736, 0.9955] | 0.9997 [0.9992, 1.0000] | 0.9996 [0.9989, 1.0000] | 0.0127 | 0.9997 |
| ConvNeXt-Base | 0.9921 [0.9843, 0.9980] | 0.9815 [0.9614, 0.9956] | 1.0000 [1.0000, 1.0000] | 0.9907 [0.9803, 0.9978] | 0.9993 [0.9979, 1.0000] | 0.9990 [0.9968, 1.0000] | 0.0123 | 1.0000 |
| ConvNeXt-Large | 0.9921 [0.9843, 0.9980] | 0.9952 [0.9847, 1.0000] | 0.9858 [0.9673, 1.0000] | 0.9905 [0.9802, 0.9978] | 0.9995 [0.9985, 1.0000] | 0.9994 [0.9981, 1.0000] | 0.0078 | 1.0000 |

## Analisis signifikansi (CI 95% accuracy, aturan spec §7/§14)

- ConvNeXt-Tiny vs ConvNeXt-Small: tidak signifikan (CI overlap)
- ConvNeXt-Tiny vs ConvNeXt-Base: tidak signifikan (CI overlap)
- ConvNeXt-Tiny vs ConvNeXt-Large: tidak signifikan (CI overlap)
- ConvNeXt-Small vs ConvNeXt-Base: tidak signifikan (CI overlap)
- ConvNeXt-Small vs ConvNeXt-Large: tidak signifikan (CI overlap)
- ConvNeXt-Base vs ConvNeXt-Large: tidak signifikan (CI overlap)

**Kesimpulan:** tidak ada pasangan model dengan accuracy yang signifikan berbeda secara statistik -- keempat backbone setara dalam batas ketidakpastian bootstrap.

## Confusion Matrix

**ConvNeXt-Tiny**

| | Prediksi: Fractured | Prediksi: Not Fractured |
|---|---|---|
| **Aktual: Fractured** | TP=210 | FN=2 |
| **Aktual: Not Fractured** | FP=5 | TN=291 |

**ConvNeXt-Small**

| | Prediksi: Fractured | Prediksi: Not Fractured |
|---|---|---|
| **Aktual: Fractured** | TP=209 | FN=3 |
| **Aktual: Not Fractured** | FP=3 | TN=293 |

**ConvNeXt-Base**

| | Prediksi: Fractured | Prediksi: Not Fractured |
|---|---|---|
| **Aktual: Fractured** | TP=212 | FN=0 |
| **Aktual: Not Fractured** | FP=4 | TN=292 |

**ConvNeXt-Large**

| | Prediksi: Fractured | Prediksi: Not Fractured |
|---|---|---|
| **Aktual: Fractured** | TP=209 | FN=3 |
| **Aktual: Not Fractured** | FP=1 | TN=295 |

## Ablation CLAHE

| Kondisi | Accuracy | F1 | AUROC |
|---|---|---|---|
| Dengan CLAHE | 0.9902 [0.9803, 0.9980] | 0.9882 [0.9767, 0.9976] | 0.9998 [0.9993, 1.0000] |
| Tanpa CLAHE | 0.9921 [0.9843, 0.9980] | 0.9907 [0.9803, 0.9978] | 0.9993 [0.9979, 1.0000] |

