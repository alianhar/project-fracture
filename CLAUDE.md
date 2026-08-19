# project-fracture-classification

Platform riset klasifikasi patah tulang dari citra X-ray (biner: fractured /
not fractured) memakai 4 varian ConvNeXt (Tiny, Small, Base, Large). Backend
rencana FastAPI + ONNX Runtime di Hugging Face Space (Docker, gratis). Tanpa
autentikasi di level aplikasi, tanpa database — riwayat sesi disimpan di
`localStorage` browser.

**Hosting frontend menyimpang dari spec §10 (Vercel):** demo saat ini
di-deploy manual ke VPS pribadi user (`fracture.lapanproject.tech`, Nginx +
Certbot, di belakang HTTP Basic Auth karena masih 100% data mock — lihat
bagian Status). Keputusan pindah permanen ke Vercel/tetap di VPS belum
diambil; jangan asumsikan salah satu tanpa tanya user.

**Sumber kebenaran tunggal:** `docs/superpowers/specs/2026-08-12-fracture-classification-design.md`
(bahasa Indonesia). Kontrak API di §9, requirement frontend di §10. Kalau ada
konflik antara dokumen ini dan spec, **spec yang menang** — dokumen ini
adalah ringkasan orientasi, bukan pengganti.

## Status saat ini (2026-08-18)

Mengikuti urutan eksekusi di spec §13:

- ✅ **[1] Scaffold frontend** — `web/` sudah jalan penuh di atas data mock
  (MSW), belum tersambung ke backend asli. Semua commit sudah di-push ke
  `github.com/alianhar/project-fracture` (branch `master`).
- ✅ **Deploy demo publik** — live di `https://fracture.lapanproject.tech`,
  di belakang HTTP Basic Auth (kredensial ada di catatan Obsidian project
  ini, **jangan ditulis di file manapun dalam repo**). Server: VPS milik
  user (`40.81.16.159`, akses SSH via `mahago-temp-vps_key.pem`), Nginx
  dengan pola konfigurasi yang sama seperti subdomain lapan-project lain
  di server itu. Build statis di-upload manual (scp+tar) dari lokal — TIDAK
  pernah `npm install`/`npm run build` di server itu sendiri karena RAM-nya
  cuma 842MB dan server itu shared dengan project lain (`pharmaadr`,
  `sjb-migration`). Update berikutnya: ulangi urutan build lokal → scp →
  extract manual (user menolak deploy script otomatis untuk saat ini).
- ✅ **[2] Audit dataset — SELESAI, gerbang GAGAL, resplit sudah dibuat.**
  Dataset final dikonfirmasi user: Kaggle
  `usman44m/bone-fracture-x-ray-dataset` (via dosen, 2026-08-14), lokal di
  `dataset/Bone_Fracture_Dataset/` (gitignored — bukan aset yang di-commit).
  Audit dijalankan **lokal** (bukan Colab — audit murni CPU/file-I/O, tidak
  butuh GPU), langsung terhadap salinan lokal, tanpa nunggu upload Drive
  selesai. `notebooks/01_dataset_audit.ipynb` tetap versi Colab-nya (untuk
  didokumentasikan/dijalankan ulang kalau perlu), tapi eksekusi nyata yang
  dipakai untuk keputusan adalah run lokal.

  **Hasil:** kebocoran antar split **34.84%** (ambang 1% — GAGAL jauh).
  96.3% dari 508 gambar test (489 gambar) punya duplikat **byte-identik**
  (MD5 sama persis) di train. Dari klaim 10.581 file, cuma **3.370 gambar
  benar-benar unik** — sisanya salinan yang tersebar sembarangan oleh
  Kaggle uploader ke train/val/test tanpa deduplikasi. Ini konfirmasi
  empiris kuat kenapa akurasi 98.6% ConvNeXt-Small di eksperimen lama tidak
  bisa dipercaya — bukan generalisasi, kemungkinan besar hafalan test set.

  **Resplit deterministik dijalankan** (seed=42, level-klaster — setiap
  grup gambar identik/near-identik ditugaskan ke SATU split saja, jadi
  kebocoran nol *by construction*, bukan cuma di bawah ambang). Rasio
  70/15/15 dari 3.370 gambar unik → train=2358 (fractured=983,
  not_fractured=1375), val=504 (210/294), test=508 (212/296). Kelas
  sedikit imbalanced (41.7%/58.3%) — perlu `class_weight` saat training.
  Hasil: `results/audit_report.json`, `results/leakage_report.csv`,
  `results/corrupt_files.csv` (18 file korup, dilaporkan bukan dihapus),
  `results/split_manifest.json` — **manifest inilah sumber kebenaran split
  untuk training nanti, BUKAN lagi folder train/val/test asli dari Kaggle.**

  **Implikasi untuk tahap [3] retrain:** dataset riil jauh lebih kecil dari
  yang diasumsikan skrip lama (2358 vs 9240 train) — ekspektasi akurasi
  perlu diturunkan secara jujur, augmentasi & regularisasi makin penting.
- ✅ **[3] Pipeline training — SEMUA 4 backbone selesai.**
  `configs/base.yaml` (+ per-backbone `tiny/small/base_model/large.yaml`),
  `src/fracture/{data,model,train}.py`, `notebooks/02_train.ipynb` (satu
  notebook, section "Lanjut ke backbone berikutnya" di akhir untuk ganti
  model tanpa scroll ke atas). Resume asli (status.json tiap epoch) —
  terbukti jalan di praktik, dipakai berkali-kali saat troubleshooting.

  **Dua bug besar ditemukan & diperbaiki selama proses:**
  1. Generator baca gambar langsung dari Drive tiap step (40-93 detik/step)
     + sesi awal ternyata jalan di **CPU bukan GPU** (kuota GPU gratis
     Colab habis akibat banyak restart). Fix: salin dataset ke disk lokal
     Colab + pastikan GPU aktif → **361ms/step, turun ~47x**.
  2. **Bug pencatatan epoch** (`src/fracture/train.py`, fix commit
     `f3b4f96`): transisi fase1→fase2 selalu menulis `completed_epochs=30`
     dari config, TIDAK PEDULI fase1 sungguhan berhenti lebih awal via
     EarlyStopping. Berdampak nyata ke **Base** (fase1 EarlyStop di epoch
     22 → status.json salah catat completed_epochs=48, padahal asli
     23+18=41). **Cuma bug label, BUKAN bug yang merusak model** — jumlah
     epoch fase2 yang sungguhan jalan tidak berubah (Keras `initial_epoch`
     cuma memengaruhi penomoran). Tiny & Small kebetulan tidak kena
     (fase1 mereka memang penuh 30 epoch). Model `best.keras` Base tetap
     valid, tidak perlu dilatih ulang.

  **Hasil akhir (total epoch ASLI, val terbaik):**

  | Model | Fase1 | Fase2 | Total | val_acc | val_loss |
  |---|---|---|---|---|---|
  | Tiny  | 30 | 21 | 51 | 98.61% | 0.0606 |
  | Small | 30 | 28 | 58 | 98.61% | 0.0391 |
  | Base  | 23 | 18 | 41 | 99.21% | 0.0476 |
  | Large | 30 | 10 | 40 | 98.81% | 0.0408 |

  Test set (sanity check, threshold 0.5 mentah — cuma Small & Large yang
  sempat tersimpan sebelum ke-overwrite run berikutnya): Small 98.62–99.02%
  (variasi run-to-run kecil, noise numerik GPU normal), Large 99.41%.

  **Verdict jujur:** keempat model SANGAT MIRIP (98.6–99.4%). **Belum bisa
  klaim model mana "terbaik"** — itu cuma sah kalau 95% CI tidak overlap
  (spec §7/§14), dan CI belum dihitung untuk satu pun. Catatan penting
  untuk skripsi: 98,6% test Small kebetulan mirip 98,6% palsu di
  eksperimen lama — HARUS dijelaskan eksplisit kenapa kali ini valid (nol
  duplikat by construction, bukan kebetulan mencurigakan).

  File `.keras` (300MB–1,9GB per model) TIDAK di-commit (gitignored) —
  cuma history CSV/status/plot di `fracture-runs/<backbone>_<hash>/`
  sebagai bukti. Model asli ada di Drive user.
- ✅ **Keempat backbone selesai training.** `fracture-runs/{tiny_a817fd5a,
  small_4fdac66d,base_cf7600d6,large_789f2c2e}/` berisi `best.keras` +
  `latest.keras` (belum di-commit ke git — gitignored — evidence CSV/plot
  saja yang masuk repo, sama seperti Small sebelumnya).
- 🔶 **[4]+[5] Evaluasi formal + ekspor ONNX — notebook ditulis & divalidasi
  secara statis, BELUM dijalankan di Colab.** `notebooks/03_evaluate_export.ipynb`
  (23 sel) mengimplementasikan spec §7+§8 untuk keempat model sekaligus:
  bootstrap 95% CI (2000 resample), threshold Youden dari VALIDATION
  (bukan test — fix F4), kalibrasi (temperature scaling + ECE +
  reliability diagram), risk-coverage curve, gerbang OOD (Mahalanobis di
  fitur GAP, referensi OOD = CIFAR-10 publik, bukan `/dataset/` lokal —
  keduanya kelasnya tetap X-ray in-distribution), Grad-CAM analitik
  (`src/fracture/gradcam.py`, turunan closed-form untuk head
  GAP→Dense(gelu)→Dense(sigmoid), diverifikasi < 1e-4 vs GradientTape
  ground-truth di KEDUA arah kelas — fix B3), ekspor ONNX 2-output
  `[prob, featmap]` + bobot head terpisah sebagai `.npz` (supaya server
  bisa hitung Grad-CAM/OOD NumPy murni tanpa TensorFlow), verifikasi
  parity probabilitas ONNX vs Keras (< 1e-4).

  Modul pendukung (`src/fracture/{evaluate,calibration,gradcam,ood,
  export_onnx}.py`) sudah divalidasi lokal lewat smoke test numpy/sklearn/
  scipy murni (finite-difference check turunan Grad-CAM analitik cocok
  dengan gradien numerik sampai ~5e-7) — TAPI belum pernah dijalankan
  end-to-end dengan model ConvNeXt sungguhan (butuh Colab, tidak ada
  TensorFlow lokal). **`clahe_ablation` sengaja TIDAK diisi** di
  `results/metrics.json` yang dihasilkan — itu spec §11, dikerjakan
  terpisah setelah model terbaik diketahui dari CI di sini.

  **Update 2026-08-19/20:** notebook sudah dijalankan nyata di Colab web
  (bukan VS Code — VS Code↔kernel remote Colab terbukti tidak stabil
  untuk cell yang lama, `Canceled future for execute_request`). Proses
  debug panjang (7 iterasi fix, lihat commit `f9ec5fc`..`6f4e1a6`)
  sampai **Tiny berhasil ekspor ONNX penuh + lolos verifikasi parity**.
  Masalah terbesar: ekspor ONNX ConvNeXt gagal berulang kali
  (`StatefulPartitionedCall` dari depthwise-conv custom-gradient,
  `Erfc`/`TFL_GELU` tidak didukung tf2onnx) — solusi akhir: pivot lewat
  TFLite (`TF→TFLite→ONNX`, bukan `TF graph→ONNX` langsung) + custom op
  handler tf2onnx utk `TFL_GELU`. **Konsekuensi: ekspor ONNX jadi
  2-output `[prob, featmap]`** (bukan 3-output `prob/featmap/z` yang
  ditulis literal di spec §8) — `z` (pra-aktivasi Dense-512) dihitung
  manual NumPy di server dari `featmap`+bobot `.npz`, karena `Dense+gelu`
  Keras menyatu, tidak ada hook ke pra-aktivasi utk dijadikan output ONNX
  terpisah. **Spec §8 perlu diupdate teksnya** supaya sinkron — belum
  dilakukan, dicatat di sini dulu. Kedua, kernel OOM berulang saat loop 4
  backbone dalam 1 sesi (dugaan user, terkonfirmasi lewat log
  `AsyncIOLoopKernelRestarter` — restart otomatis Jupyter, ciri OOM-killer
  Linux) — mitigasi: `clear_session()`+`gc.collect()` antar iterasi,
  monitoring RAM/VRAM eksplisit, DAN resume per-backbone lewat cache
  `{backbone}_metrics.json` di Drive (kalau kernel mati, backbone yang
  sudah selesai tidak perlu diulang). **Status saat tulisan ini dibuat:
  loop 4-backbone MASIH BERJALAN** (Small/Base/Large belum terkonfirmasi
  selesai) — `results/metrics.json` belum ada di repo.
- 🔶 **[7] Backend FastAPI — scaffold selesai & TERUJI LOKAL (model ONNX
  sintetis), BELUM pernah lihat model ConvNeXt sungguhan.** `api/` baru:
  `main.py` (6 endpoint spec §9), `schemas.py` (cermin persis
  `web/src/lib/api/types.ts`), `inference.py` (ONNX Runtime + NumPy murni
  — TANPA TensorFlow, konsolidasi predict/explain/compare ke satu
  `_full_analysis()` supaya kalibrasi & OOD tidak bisa drift antar
  endpoint), `model_registry.py` (lazy-load + LRU cache, default 2 model
  resident), `config.py`, `Dockerfile`, `requirements.txt`. Diuji end-to-
  end via `fastapi.testclient.TestClient` + model ONNX sintetis buatan
  sendiri (bukan ConvNeXt asli) — `/health`, `/models`, `/predict`,
  `/explain`, `/predict/batch` semua jalan; `/compare` gagal-cepat 503
  yang jelas saat model lain belum ada (diharapkan, cuma `tiny` sintetis
  yg dibuat).

  **Efek samping penting:** `src/fracture/data.py` di-refactor —
  `preprocess_image()` TIDAK lagi memanggil TensorFlow langsung (Keras
  `convnext.preprocess_input` dikonfirmasi identity murni, `return x`),
  import TF di `make_generators()` dijadikan lazy. Ini supaya backend
  TIDAK butuh TensorFlow sama sekali (spec §8: image Docker ~400MB bukan
  ~3GB) sambil tetap satu sumber preprocessing (fix F1, tidak duplikasi).
  Kalau asumsi identity ini pernah salah, `verify_prob_parity()` di
  `export_onnx.py` akan menangkapnya (selisih ONNX vs Keras >= 1e-4).

  **Belum ada / sengaja ditunda:** repo HF Model (tempat `.onnx`/`.npz`
  asli disimpan + diunduh saat container start) belum dibuat — `MODEL_DIR`
  backend masih baca dari disk lokal/mount manual. `/health` belum
  mencerminkan progres unduh model (`status: "ready"` langsung, cold-start
  riil belum diimplementasikan). Belum pernah `docker build` (Dockerfile
  butuh `results/metrics.json` yang belum ada).
- ⏳ **[6], [8], [9]** — ablation CLAHE (di model terbaik saja, setelah
  hasil notebook 03 selesai & CI dibandingkan), integrasi web ke backend
  asli (ganti mock MSW), figure publikasi.

## ⚠️ Anomali belum terjelaskan (2026-08-14)

`data experiment/ConvNeXt_Base.ipynb` berubah di disk (urutan key JSON
`output_type`/`name` tertukar di banyak output cell) — isi/data sama persis,
cuma urutan serialisasi berbeda. **Bukan dari sesi Claude manapun** (arsip
ini cuma pernah dibaca, tidak pernah ditulis ulang). Kemungkinan besar
ter-resave oleh Jupyter/VS Code/Colab lokal. Belum di-commit — cek dulu
`git diff "data experiment/ConvNeXt_Base.ipynb"` sebelum memutuskan commit
atau `git checkout` untuk buang perubahan ini.

## Catatan status dataset (2026-08-13)

Dataset `Bone_Fracture_Dataset` yang sudah ada di Drive user (dipakai di
eksperimen lama) dikonfirmasi user sebagai dataset **final** untuk skripsi
— bukan sementara. User juga menyebut kemungkinan menerima data tambahan
dari dosen pembimbing (perkiraan waktu: sekitar 2026-08-14), tapi ini
belum dikonfirmasi akan menggantikan dataset yang ada atau tidak. Notebook
audit sengaja dirancang dataset-agnostic (satu baris `DATASET_ROOT`) supaya
tidak ada kerja terbuang di kedua kemungkinan.

`data experiment/` adalah **arsip read-only** (notebook & script eksperimen
lama) — jangan diedit. Audit terhadapnya ada di spec §2; hasilnya jangan
dipakai sebagai angka final (lihat §2.1–2.3: preprocessing train≠test,
perbandingan arsitektur tidak terkontrol, notebook Base kode≠output).

## Tech stack `web/`

React 19 + Vite + TypeScript, Tailwind v4 (`@tailwindcss/vite`, **tanpa**
`tailwind.config.js` — token via `@theme` di CSS), Radix UI + `cva` + `cn()`
(lapisan `components/ui/`, gaya shadcn tapi token sendiri), `@phosphor-icons/react`
(satu-satunya library ikon — jangan campur dengan lucide/react-icons seperti
project React lain di ekosistem ini), `react-router-dom`, `@tanstack/react-query`,
`recharts`, `react-dropzone`, `msw` (mock API), `motion` (Framer Motion).
Package manager **npm saja** (konsisten dengan seluruh project user).

## Design system

Arah visual: **"radiology lightbox / instrument panel"** — digali dari
software PACS/viewer radiologi sungguhan dan kebiasaan radiolog melingkari
titik patah dengan pensil lilin oranye di atas film. Bukan dark-mode SaaS
generik.

- **Token 3-lapis** di `web/src/styles/tokens.css`: primitif hex → semantik
  `:root` (nama TANPA prefix `color-`, mis. `--bg`, `--text`, `--positive`)
  → override `:root[data-theme="light"]`. Dark ("lightbox") adalah mode
  **default**; light ("printout") adalah laporan klinis tercetak, bukan
  dark mode dibalik.
- **Aturan keras: tidak ada class Tailwind `dark:` di mana pun.** Tema 100%
  lewat atribut `data-theme` di `<html>` + custom property. `@theme` di
  `web/src/styles/index.css` memetakan token semantik ke nama utility
  Tailwind (`--color-bg: var(--bg)`, dst) — **nama di kedua sisi harus
  berbeda**, kalau sama jadi custom property yang mereferensikan dirinya
  sendiri (invalid/kosong).
- **Font:** Montserrat = display/headline/angka besar. Poppins = body/UI
  text. JetBrains Mono = **sempit**, khusus angka/data tabular (tabel,
  sumbu chart) — bukan prosa/headline. Semua self-hosted lewat Fontsource
  (`@fontsource-variable/*`), bukan `<link>` ke Google Fonts.
- **"No AI slop":** hindari gradasi ungu-biru/mesh gradient, glassmorphism,
  blob membulat generik, ikon emoji, layout "hero gradient text" template.
  Vignette gelap monokrom di viewer tetap OK (foto sungguhan, bukan hiasan).
  Radius nyaris nol (2–4px), hairline border menggantikan shadow.
- **Warna semantik:** `positive` (grease-oranye) = fractured/Grad-CAM.
  `negative` (verdigris-teal) = not_fractured/kalibrasi aman. `warning` =
  abstain/cold-start. `danger` = error API — sengaja terpisah dari
  `positive` supaya semantik klinis tidak tabrakan dengan error teknis.
  Warna identitas model di chart Benchmark (`MODEL_CHART_COLORS`) sengaja
  terpisah lagi dari keempat warna semantik di atas.

## Konvensi

- **Toggle mock API:** `VITE_USE_MOCKS=true|false` di `web/.env.local`.
  Kode pemanggil API (`lib/api/endpoints.ts`) ditulis persis seperti akan
  dipanggil ke backend asli — flip env var saja, nol perubahan kode lain.
- **Three.js sengaja ditunda.** Lihat `web/src/components/three/README.md`
  untuk rencana 2 komponen masa depan. Jangan tambah `three`/`@react-three/*`
  tanpa membuka ulang keputusan ini.
- **i18n baru struktur**, belum ada UI switch bahasa. Lihat
  `web/src/i18n/README.md`.
- **Nol angka hardcode** di halaman Benchmark/Methodology — semua dari
  `getMetrics()` (mock sekarang, `/metrics` asli nanti).
- Preprocessing model (saat training/backend dibangun) wajib satu sumber:
  `src/fracture/data.py` (per spec §4) — bug utama eksperimen lama adalah
  preprocessing ditulis ulang di beberapa tempat berbeda.

## Perintah dev

```bash
cd web
npm install
npm run msw:init   # sekali di awal — generate public/mockServiceWorker.js
cp .env.example .env.local
npm run dev
npm run build       # tsc -b && vite build
npm run lint         # eslint .
```

## Remote

`git remote origin` sudah di-set ke `https://github.com/alianhar/project-fracture.git`.
**Push hanya dilakukan saat diminta eksplisit** — belum pernah di-push
otomatis oleh sesi manapun.
