# Fracture Classification — Research Platform

**Tanggal:** 2026-08-12
**Status:** Disetujui, siap masuk tahap perencanaan implementasi

---

## 1. Latar Belakang

Project ini mengklasifikasikan citra X-ray tulang menjadi *fractured* / *not fractured*
menggunakan empat varian arsitektur ConvNeXt (Tiny, Small, Base, Large), lalu
mendeploy hasilnya sebagai web demo penelitian.

Eksperimen awal tersimpan di `data experiment/` (4 notebook Colab + ekspor `.py` +
3 `.docx`). Audit terhadap arsip tersebut menemukan sejumlah cacat fatal yang membuat
hasilnya tidak dapat dipertanggungjawabkan. Spec ini mendefinisikan pembangunan ulang
yang benar, bukan penambalan.

Arsip `data experiment/` **dipertahankan apa adanya sebagai bukti historis** dan bahan
bab "analisis kegagalan awal".

---

## 2. Temuan Audit Eksperimen Lama

### 2.1 Cacat fatal

**F1 — Ketidakcocokan preprocessing train vs test.**
Pada Tiny, Base, dan Large, generator train/val memakai `rescale=1./255` (rentang
`[0,1]`), sedangkan generator test memakai `preprocessing_function=convnext_preprocess`.
`keras.applications.convnext.preprocess_input` adalah **fungsi kosong** — dokumentasi
resminya menyatakan *"This method does nothing and only kept as a placeholder"*, karena
normalisasi sudah menjadi layer di dalam model ConvNeXt. Akibatnya model diuji pada
data berskala `[0,255]` sementara dilatih pada `[0,1]`.

Dampak terukur:

| Model | Val acc (akhir) | Test acc | Recall |
|---|---|---|---|
| Tiny | 0.8797 | 0.5320 | 0.1298 |
| Base | 0.9611 | 0.4800 | 0.0076 |
| Large | 0.9708 | 0.5000 | 0.0496 |
| Small | 0.9939 | 0.9860 | 1.0000 |

Small adalah satu-satunya notebook yang memakai generator konsisten untuk train, val,
dan test — dan satu-satunya yang test-nya waras. Konfirmasi tambahan: pada fase frozen
(20 epoch pertama, backbone beku), Small mencapai val acc 0.9502 sementara Tiny/Base/Large
hanya 0.67–0.81, karena input `[0,1]` melumpuhkan layer normalisasi bawaan ConvNeXt.

**F2 — Perbandingan antar arsitektur tidak terkontrol.**
Tiga variabel berubah bersamaan antar model:

| | Tiny | Small | Base | Large |
|---|---|---|---|---|
| Preprocessing konsisten | tidak | **ya** | tidak | tidak |
| LR fase 1 | 5e-5 | 1e-4 | 1e-4 | 5e-5 |
| LR fase 2 | 5e-6 | 1e-5 | 1e-5 | 5e-6 |
| Epoch fase 2 | 25 | 55 | 55 (kode) / 25 (output) | 25 |
| GPU | tidak tercatat | A100 | T4 | tidak tercatat |

Klaim "ConvNeXt-Small adalah arsitektur terbaik" **tidak sah**: Small memperoleh
preprocessing yang benar, learning rate 2× lebih besar, dan epoch 2× lebih banyak.
Yang terukur adalah perbedaan konfigurasi, bukan perbedaan arsitektur.

**F3 — Notebook Base: kode tidak cocok dengan output.**
Kode menyatakan `epochs=55`; output menunjukkan `Epoch 20/25`…`Epoch 25/25`. Notebook
diedit setelah dijalankan lalu disimpan tanpa run ulang. Hasil Base tidak reproducible.

**F4 — Threshold optimal dicari di test set.**
`optimal_idx = np.argmax(tpr - fpr)` dihitung dari `roc_curve(y_true, y_prob)` pada test
set, lalu hasilnya dilaporkan sebagai metrik. Ini kebocoran data; threshold wajib dipilih
di validation set.

**F5 — Validasi dilakukan di atas gambar teraugmentasi.**
Pada Small, `val_gen` dan `test_gen` dibuat dari `datagen` yang memiliki rotasi 30°,
shift 0.2, shear, zoom, dan horizontal flip, tanpa `shuffle=False`. Seluruh kurva
`val_accuracy` Small tidak valid. (Angka test 98.6% tetap sah karena `test_gen` dibuat
ulang secara bersih di sel evaluasi.)

### 2.2 Cacat reproducibility

| Kode | Temuan |
|---|---|
| R1 | `RANDOM_SEED = 42` didefinisikan tetapi tidak pernah diteruskan ke generator manapun |
| R2 | `deep_clean_images()` **menghapus** file dari dataset; dataset setelah run ≠ dataset sebelum run |
| R3 | `model_convnext_new_history.csv` dan `model_convnext_new_lung_.weights.h5` bernama identik di 4 notebook sehingga saling menimpa; history 3 model hilang |
| R4 | Model disimpan ke path relatif (storage Colab ephemeral) tetapi dimuat dari `/content/drive/MyDrive/Model/` — ada langkah copy manual yang tidak terdokumentasi |
| R5 | Seluruh `execution_count` bernilai `null`; urutan eksekusi sel tidak dapat dibuktikan |
| R6 | Epoch pertama Small memakan 4116 detik (7 dtk/step) versus ~200 detik epoch berikutnya — bottleneck I/O Google Drive membuat klaim waktu training tidak sebanding |

### 2.3 Klaim metodologi yang tidak didukung kode

| Kode | Temuan |
|---|---|
| M1 | `apply_clahe()` didefinisikan tetapi **tidak pernah masuk pipeline training** — hanya dipakai di fungsi visualisasi `get_Image()` |
| M2 | Pada Small, `EarlyStopping`, `ReduceLROnPlateau`, dan `StopAtAccuracy` diimpor dan didefinisikan tetapi **tidak pernah diteruskan ke `model.fit()`** |

Keduanya adalah dead code. Menuliskannya di bab metodologi akan menjadi klaim palsu.

### 2.4 Bug teknis

| Kode | Temuan |
|---|---|
| B1 | `initial_epoch=r_frozen.epoch[-1]` bernilai 19, sehingga epoch 20 dijalankan dua kali (off-by-one) |
| B2 | `fine_tune_from = 50` adalah angka arbitrer; pada Large membuka porsi jaringan yang sangat berbeda dibanding pada Tiny |
| B3 | Grad-CAM memakai `loss = predictions[:,0]` sehingga gradien selalu mengarah ke kelas 1; heatmap untuk prediksi kelas 0 menyorot area yang salah |
| B4 | Grad-CAM memilih layer `Conv2D` terakhir, yang pada ConvNeXt dapat berupa konvolusi 1×1 pointwise, bukan feature map spasial yang informatif |
| B5 | Tidak ada callback sama sekali pada Tiny/Base/Large; model yang tersimpan adalah epoch terakhir, bukan yang terbaik |
| B6 | Tidak ada interval kepercayaan; test set hanya 500 gambar sehingga selisih kecil antar model tidak dapat diklaim signifikan |
| B7 | `test_gen` memakai `class_mode` default (`categorical`) padahal output model sigmoid tunggal |
| B8 | Blok inference + Grad-CAM terduplikasi 100% identik di Tiny, Base, dan Large |
| B9 | Base CELL 15 memakai variabel `history` yang seluruh definisinya dikomentari — `NameError` bila dijalankan dari atas |
| B10 | Base memiliki dua sel plotting yang saling bertentangan (satu memakai `len(history)`, satu hardcode `range(1,26)`) |
| B11 | Nama file model `convnext_lung_fixed_*.keras` merupakan sisa copy-paste dari project paru-paru |

### 2.5 Status arsip

- `main.py` berisi `print("hello word")` — placeholder, tidak terpakai.
- File `.docx` berisi dump kode, bukan laporan hasil; tidak ada tabel metrik tersimpan.
- `convnext base.docx` **hilang**; hanya menyisakan lock file Word `~$nvnext base.docx`.
- Notebook dan ekspor `.py` terverifikasi identik (beda hanya header docstring).

### 2.6 Risiko yang belum terverifikasi

**Potensi kebocoran antar split.** Dataset terbagi 9240 train / 823 val / 500 test.
Bila pembagian dilakukan per-gambar dan bukan per-pasien, atau bila terdapat duplikat
hasil augmentasi lintas split, maka seluruh angka test menjadi terlalu optimis.
Verifikasi ini menjadi langkah pertama yang memblokir seluruh pekerjaan berikutnya.

---

## 3. Keputusan yang Sudah Ditetapkan

| Topik | Keputusan |
|---|---|
| Task | Klasifikasi biner *fractured* / *not fractured* |
| Label region | Diperiksa saat audit. Bila tidak tersedia, tetap biner (tidak beralih dataset) |
| Perbandingan | 4 arsitektur ConvNeXt dengan konfigurasi identik |
| Model lama | Tidak tersedia lagi — retrain seluruhnya dari nol |
| Training | Google Colab, dataset di Google Drive |
| Inference | FastAPI + ONNX Runtime di Hugging Face Space (Docker) |
| Frontend | React + Vite + TypeScript + Tailwind + Phosphor Icons, di Vercel |
| Autentikasi | **Tidak ada.** Riwayat disimpan di `localStorage` |
| Dokumen tertulis | Belum mengutip angka lama — bebas mengganti seluruh hasil |

---

## 4. Arsitektur

```
project-fracture-classification/
├── data experiment/           # ARSIP — read-only, tidak diubah
├── configs/
│   ├── base.yaml              # hyperparameter terkunci, dipakai 4 model
│   └── {tiny,small,base,large}.yaml   # hanya berisi override `backbone`
├── notebooks/
│   ├── 01_dataset_audit.ipynb
│   ├── 02_train.ipynb
│   └── 03_evaluate_export.ipynb
├── src/fracture/
│   ├── data.py                # SATU-SATUNYA definisi preprocessing
│   ├── model.py               # perakitan backbone + head
│   ├── train.py               # dua fase, callbacks, resume
│   ├── evaluate.py            # metrik + bootstrap CI
│   ├── calibration.py         # temperature scaling
│   ├── gradcam.py             # Grad-CAM analitik
│   ├── ood.py                 # Mahalanobis OOD gate
│   └── export_onnx.py         # ekspor 3-output + verifikasi parity
├── api/
│   ├── app/{main,inference,gradcam,ood}.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md              # header konfigurasi HF Space
├── web/                       # React
├── runs/                      # artefak per-run (gitignored)
├── results/
│   ├── metrics.json           # sumber tunggal seluruh angka
│   └── figures/
└── docs/superpowers/specs/
```

### 4.1 Prinsip pengikat

**Preprocessing didefinisikan tepat satu kali** di `src/fracture/data.py`, lalu diimpor
oleh notebook training *dan* backend inference. Cacat F1 terjadi karena preprocessing
ditulis ulang di tiga tempat berbeda; struktur ini membuat pengulangan cacat tersebut
tidak mungkin terjadi.

**Tidak ada angka yang di-hardcode di mana pun.** Web, figure, dan tabel publikasi
seluruhnya dibangkitkan dari `results/metrics.json`.

---

## 5. Tahap 1 — Audit Dataset (memblokir)

Notebook read-only. **Tidak menghapus file apa pun** — berbeda dari `deep_clean_images`
yang destruktif.

| Pemeriksaan | Tujuan |
|---|---|
| Pola nama file dan struktur folder | Menentukan ketersediaan label region |
| **Duplikat lintas split via perceptual hash** | Mendeteksi kebocoran train↔val↔test |
| Distribusi kelas per split | Menentukan kebutuhan `class_weight` |
| File korup | **Dilaporkan ke CSV**, tidak dihapus |
| Statistik dimensi, channel, bit depth | Menentukan strategi resize |

Keluaran: `results/audit_report.json`.

**Gerbang keputusan:** bila duplikat lintas split melebihi 1%, split dibuat ulang
secara deterministik (seed tetap, dicatat ke `results/split_manifest.json`) dan seluruh
angka lama dibuang.

---

## 6. Tahap 2 — Pipeline Training

### 6.1 Konfigurasi terkunci

```yaml
# configs/base.yaml — identik untuk keempat model
seed: 42
img_size: 224
batch_size: 16
preprocessing: convnext_native        # [0,255] mentah, tanpa rescale
augment_train: {rotation: 15, zoom: 0.15, hflip: true}
augment_val:   none
augment_test:  none
phase1: {epochs: 30, lr: 1.0e-4, frozen: true}
phase2: {epochs: 40, lr: 1.0e-5, unfreeze: [stage3, stage4]}
callbacks:
  - EarlyStopping(monitor=val_loss, patience=8, restore_best_weights=true)
  - ModelCheckpoint(save_best_only=true)
  - ReduceLROnPlateau(patience=4)
  - CSVLogger
```

`configs/{tiny,small,base,large}.yaml` hanya berisi satu baris: `backbone:`.

### 6.2 Perbaikan terhadap cacat yang teridentifikasi

| Cacat | Perbaikan |
|---|---|
| F1 | `rescale` dihapus total. ConvNeXt menerima `[0,255]` mentah. Satu fungsi generator untuk seluruh split |
| F2 | Seluruh hyperparameter dikunci di `base.yaml`; hanya `backbone` yang bervariasi |
| F3 | Notebook dijalankan dari atas ke bawah; `metrics.json` menyimpan hash config, versi library, dan tipe GPU |
| F4 | Threshold dipilih di **validation**, dilaporkan di **test** |
| F5 | Generator val dan test dijamin tanpa augmentasi dan `shuffle=False`; diverifikasi oleh unit test |
| R1 | `tf.keras.utils.set_random_seed(42)` dan `seed=` pada seluruh generator |
| R2 | File korup dilaporkan, tidak dihapus |
| R3 | Seluruh artefak masuk `runs/{backbone}_{config_hash}_{timestamp}/` |
| R4 | Penyimpanan langsung ke Drive, tanpa langkah copy manual |
| R6 | Dataset disalin ke disk lokal Colab di awal; `tf.data` dengan cache dan prefetch |
| M1 | CLAHE menjadi **ablation study resmi**, bukan dead code |
| M2 | Callbacks benar-benar diteruskan ke `model.fit(callbacks=[...])` |
| B1 | `initial_epoch = len(r_frozen.epoch)` |
| B2 | Unfreeze **per stage** (stage 3–4), konsisten lintas ukuran model |
| B5 | `ModelCheckpoint(save_best_only=True)` + `restore_best_weights=True` |
| B7 | `class_mode='binary'` konsisten di seluruh generator |
| B11 | Penamaan artefak mengikuti backbone dan config hash |

### 6.3 Ketahanan sesi Colab

Retrain empat model membutuhkan ~3–4 jam dan sesi Colab gratis dapat terputus sewaktu-waktu.

- `ModelCheckpoint` menulis ke Drive **setiap epoch**.
- Notebook mendeteksi checkpoint terakhir dan **melanjutkan** dari sana.
- Status setiap run dicatat ke `runs/*/status.json`.

### 6.4 Estimasi biaya

| Model | Perkiraan durasi (T4, setelah optimasi I/O) |
|---|---|
| Tiny | ~40 menit |
| Small | ~60 menit |
| Base | ~75 menit |
| Large | ~120 menit |

Total ~4–5 jam, dapat dipecah lintas sesi berkat mekanisme resume.

---

## 7. Tahap 3 — Evaluasi

Seluruhnya dihitung di `03_evaluate_export.ipynb` dan ditulis ke `results/metrics.json`.

| Komponen | Detail |
|---|---|
| Metrik dasar | Accuracy, precision, recall, F1, AUROC, AUPRC |
| **Bootstrap CI** | 2000 resample, 95% CI untuk seluruh metrik |
| **Kalibrasi** | Temperature scaling di validation; laporkan ECE dan reliability diagram |
| **Pemilihan threshold** | Youden's J di **validation**, diterapkan ke test |
| **Selective prediction** | Zona abstain; risk–coverage curve |
| **OOD** | Mahalanobis di ruang fitur; threshold dari validation; laporkan AUROC OOD |
| TTA | Horizontal flip, opsional, dilaporkan terpisah |
| Evaluasi Grad-CAM | Deletion–insertion curve secara kuantitatif |

Klaim "model A lebih baik dari model B" hanya dibuat bila 95% CI keduanya tidak
bertumpang tindih.

---

## 8. Tahap 4 — Grad-CAM Analitik

ONNX Runtime tidak dapat menghitung gradien, sedangkan Grad-CAM membutuhkan backward
pass. Memasang TensorFlow penuh di server akan membengkakkan image Docker menjadi ~3 GB
dan memperparah cold start.

Head model berbentuk sederhana:

```
featmap ──► GAP ──► Dense(512, gelu) ──► Dense(1, sigmoid)
```

sehingga gradien terhadap feature map memiliki bentuk tertutup:

```
pooled_grad[c] = (1/HW) · Σⱼ W₂[j] · gelu′(zⱼ) · W₁[c,j]
heatmap        = ReLU( Σ_c pooled_grad[c] · A[:,:,c] )
```

Karena `pooled_grad` konstan secara spasial, hasilnya **identik persis** dengan Grad-CAM
berbasis `GradientTape`.

**Implementasi:** ekspor ONNX dengan tiga output — `prob`, `featmap` (output stage
terakhir), dan `z` (pra-aktivasi Dense-512). Grad-CAM dihitung di NumPy murni.

Keuntungan: image Docker ~400 MB (bukan 3 GB), satu forward pass (~50 ms), cold start
jauh lebih ringan.

Sekaligus memperbaiki B3 (arah gradien untuk prediksi kelas negatif) dan B4 (target
layer memakai output stage terakhir, bukan `Conv2D` terakhir).

Verifikasi wajib: selisih absolut maksimum antara heatmap ONNX dan heatmap Keras
< 1e-4, dicatat di `results/metrics.json`.

---

## 9. Tahap 5 — Backend

FastAPI + ONNX Runtime, di-deploy sebagai **Docker Space** di Hugging Face
(2 vCPU, 16 GB RAM, gratis). Bobot model disimpan di **HF Model repo** terpisah dan
diunduh saat container start, sehingga repo Space tetap ringan.

```
GET  /health          status warm-up
GET  /models          daftar model beserta metadata
GET  /metrics         isi metrics.json
POST /predict         label, prob mentah, prob terkalibrasi, threshold, keputusan, latency
POST /explain         Grad-CAM PNG base64 + prob
POST /predict/batch   multi-gambar
POST /compare         satu gambar, seluruh model
```

**Keputusan bernilai tiga:** `fractured` / `not_fractured` / `abstain`.

**Gerbang OOD** dijalankan sebelum prediksi. Tanpa ini, foto non-X-ray tetap
menghasilkan prediksi berkeyakinan tinggi.

Model di-*lazy load* dengan LRU cache agar boot cepat dan penggunaan RAM terkendali.

**Cold start:** Space gratis tidur setelah 48 jam idle; bangun kembali membutuhkan
30–60 detik. Ditangani secara eksplisit di frontend (§10).

---

## 10. Tahap 6 — Frontend

**Stack:** React 19 + Vite + TypeScript + Tailwind v4 + Phosphor Icons + TanStack Query
+ Recharts + react-dropzone. Tanpa autentikasi, tanpa database.

| Halaman | Isi |
|---|---|
| **Analyze** | Dropzone; hasil berupa badge label, bar confidence, probabilitas terkalibrasi, peringatan abstain, overlay Grad-CAM dengan slider opacity, dan slider threshold interaktif |
| **Compare** | Satu gambar dibandingkan pada keempat model: probabilitas, latency, dan Grad-CAM masing-masing |
| **Benchmark** | Dirender otomatis dari `metrics.json`: tabel dengan 95% CI, ROC, PR, reliability diagram, confusion matrix interaktif, risk–coverage curve |
| **Methodology** | Pipeline, hasil ablation CLAHE, keterbatasan, disclaimer medis |
| **History** | Riwayat sesi via `localStorage`, ekspor CSV |

**Penanganan cold start:** selama `/health` belum siap, tampilkan status eksplisit
"Menghangatkan model — ±40 detik" beserta progress, dengan auto-retry. Bukan spinner
tanpa keterangan.

Tambahan: dark mode, i18n ID/EN, dan sebuah **Gradio Space cadangan** sebagai jaring
pengaman saat demo.

---

## 11. Tahap 7 — Ablation CLAHE

Dijalankan **hanya pada model terbaik** hasil perbandingan arsitektur, bukan pada
keempatnya. Dua run: dengan dan tanpa CLAHE, seluruh hyperparameter lain identik.
Bila CLAHE dipakai, ia diterapkan di `preprocessing_function` secara konsisten pada
train, val, dan test.

Ini menyelesaikan M1: CLAHE berubah dari dead code menjadi variabel eksperimen yang
sah, dengan biaya komputasi yang wajar.

---

## 12. Deliverable

1. **Notebook Colab yang diperbaiki** — audit, training, evaluasi; reproducible dan resume-safe.
2. **Web React + dashboard** — Analyze, Compare, Benchmark, Methodology, History.
3. **Backend FastAPI + HF Space** — beserta Dockerfile dan konfigurasi deploy.
4. **Bahan tulisan ilmiah** — tabel dan figure siap publikasi, seluruhnya dibangkitkan
   otomatis dari `results/metrics.json`.

---

## 13. Urutan Eksekusi

```
[1] git init + scaffold repo                            ~30 mnt
[2] Audit dataset                                       ~20 mnt   ◄── GERBANG
[3] Retrain 4 model, konfigurasi identik, resume-safe   ~4-5 jam
[4] Evaluasi: kalibrasi, bootstrap CI, abstention, OOD  ~15 mnt
[5] Ekspor ONNX 3-output + verifikasi parity            ~10 mnt
[6] Ablation CLAHE (model terbaik saja)                 ~1 jam
[7] Backend FastAPI + HF Space
[8] Web React + dashboard
[9] Figure dan tabel siap publikasi
```

Tahap [2] memblokir seluruh tahap berikutnya: retrain tidak boleh dimulai sebelum
status kebocoran antar split diketahui.

---

## 14. Kriteria Keberhasilan

1. Preprocessing train, val, dan test terbukti identik melalui unit test.
2. Keempat model dilatih dengan config hash yang sama; hanya `backbone` berbeda.
3. Setiap notebook dapat dijalankan dari atas ke bawah tanpa error dan tanpa langkah manual.
4. Setiap metrik yang dilaporkan disertai 95% CI.
5. Threshold dipilih di validation, tidak pernah di test.
6. Tidak ada dead code yang diklaim sebagai metodologi.
7. Heatmap Grad-CAM ONNX cocok dengan Keras dalam toleransi 1e-4.
8. Web merender seluruh angka dari `metrics.json`; nol angka hardcode.
9. Gerbang OOD menolak citra non-X-ray dengan AUROC yang terlaporkan.

---

## 15. Keterbatasan yang Akan Dinyatakan Terbuka

- Dataset berasal dari satu sumber; generalisasi lintas institusi belum diuji.
- Label bersifat biner; tipe fraktur dan lokasi anatomis tidak diprediksi.
- Sistem bersifat alat bantu penelitian, **bukan alat diagnosis**, dan tidak
  tersertifikasi untuk penggunaan klinis.
- Bila audit menemukan pembagian split bukan per-pasien, keterbatasan ini dinyatakan
  eksplisit meskipun split telah dibuat ulang.
