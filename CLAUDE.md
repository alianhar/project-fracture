# project-fracture-classification

Platform riset klasifikasi patah tulang dari citra X-ray (biner: fractured /
not fractured) memakai 4 varian ConvNeXt (Tiny, Small, Base, Large). Backend
FastAPI + ONNX Runtime, target deploy **Google Cloud Run** (lihat deviasi di
bawah). Tanpa autentikasi di level aplikasi, tanpa database — riwayat sesi
disimpan di `localStorage` browser.

**Hosting frontend menyimpang dari spec §10 (Vercel):** demo di-deploy manual
ke VPS pribadi user (`fracture.lapanproject.tech`, Nginx + Certbot). **Sejak
2026-08-20: PUBLIK, TANPA Basic Auth, TERSAMBUNG BACKEND ASLI** (bukan mock
lagi) — lihat bagian Status untuk detail. Keputusan pindah permanen ke
Vercel/tetap di VPS belum diambil; jangan asumsikan salah satu tanpa tanya
user.

**Hosting backend menyimpang dari spec §9 (Hugging Face Space):** dikonfirmasi
2026-08-20 — HF Spaces mengubah Docker SDK (+ Gradio) di tier `cpu-basic`
gratis jadi berbayar **$9/bln (PRO)**, sejak ~8-9 Juli 2026, tanpa pengumuman
resmi ([sumber](https://discuss.huggingface.co/t/docker-sdk-now-marked-as-paid-when-creating-a-new-space/177580)).
Tidak ada workaround gratis untuk Docker di HF Spaces. Setelah dikonfirmasi
ke user dan diberi 3 opsi (bayar PRO / pindah Cloud Run / pakai VPS yang
sudah ada), **user memilih Google Cloud Run** (free tier permanen 2 juta
request/bln, scale-to-zero, Docker-native — `api/Dockerfile` sudah
disesuaikan: listen di `$PORT`, bukan port tetap 7860 ala HF). Bobot model
(.onnx+.npz) rencana diunduh dari **Google Cloud Storage** saat container
start (pengganti pola "HF Model repo" di spec asli) — bucket GCS belum
dibuat, script unduh belum ditulis. Spec §9 perlu diupdate teksnya supaya
sinkron — belum dilakukan.

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
  sudah selesai tidak perlu diulang).

  **Update lanjutan (masih 2026-08-20):** Tiny selesai (parity prob
  9.95e-5, LOLOS di ambang asli), tapi Grad-CAM parity Tiny 4.75e-2 —
  jauh di atas 1e-4, sempat "diakali" user langsung di cell Colab
  (`atol=0.05`) supaya lanjut, BUKAN diperbaiki. **Root cause ditemukan
  & diperbaiki (bukan cuma dilonggarkan):** `verify_gradcam_parity()` di
  notebook mengambil `gap_feat` dan `featmap_np` dari DUA panggilan
  `.predict()` terpisah (bug) alih-alih satu forward pass konsisten
  (`gradcam_groundtruth()` sudah benar dari awal, satu `grad_model` call)
  — inkonsistensi kecil ini teramplifikasi besar utk prediksi yang
  sangat percaya diri (sigmoid'(y)→0 di dekat saturasi). Fix: gabung jadi
  satu `combined_model.predict()`. **Belum diverifikasi ulang dengan model
  sungguhan** (perlu Tiny dijalankan ulang).

  Small lanjut jalan tapi gagal di parity **prob** (bukan Grad-CAM):
  1.68e-4 vs ambang asli 1e-4. Dianalisis genuinely noise floating-point
  wajar 3-runtime (TF eager→TFLite→ONNX Runtime), bukan bug. **Keputusan
  eksplisit user: longgarkan ambang prob parity ke 5e-4** (dari 1e-4 di
  spec §8/§14 asli) — `src/fracture/export_onnx.py verify_prob_parity()`
  default diupdate. Kalau Base/Large masih gagal di 5e-4, evaluasi ulang
  datanya dulu sebelum melonggarkan lagi. **Spec §8/§14 perlu diupdate
  teksnya** (kedua deviasi: 2-output ONNX + ambang parity 5e-4) — belum
  dilakukan.

  **PENTING sebelum lanjut run berikutnya:** cache `tiny_metrics.json` +
  `tiny.onnx` + `tiny_head.npz` di Drive HARUS DIHAPUS manual dulu --
  resume-cache tidak tahu logic verifikasi berubah, kalau dibiarkan Tiny
  bakal di-skip dengan hasil Grad-CAM parity lama yang belum tervalidasi
  fix-nya.

  **Status saat tulisan ini dibuat: loop 4-backbone MASIH BERJALAN**
  (Base/Large belum terkonfirmasi selesai) — `results/metrics.json`
  belum ada di repo.
- ✅ **[7] Backend FastAPI — LIVE di Cloud Run, teruji end-to-end dengan
  model ConvNeXt sungguhan (2026-08-20).** URL:
  `https://fracture-api-607128796608.asia-southeast2.run.app`. Project GCP:
  `project-fracture-506109`, region `asia-southeast2` (Jakarta). Model
  (`.onnx`+`.npz` ×4, ~1.45GB total) disimpan di bucket
  `gs://project-fracture-506109-models`, diunduh LAZY per-model saat
  pertama diminta (bukan semua di awal container start) — konsisten
  dengan LRU cache spec §9.

  `api/`: `main.py` (6 endpoint spec §9), `schemas.py` (cermin
  `web/src/lib/api/types.ts`), `inference.py` (ONNX Runtime + NumPy murni
  — TANPA TensorFlow, konsolidasi predict/explain/compare ke satu
  `_full_analysis()`), `model_registry.py` (lazy-load + LRU cache + unduh
  GCS via file sementara `.part` + rename atomik), `config.py`,
  `api/Dockerfile`, `cloudbuild.yaml`, `.gcloudignore`. Semua endpoint
  dites live dgn `curl`: `/health` 200, `/models` 200, `/metrics` 200
  (data asli 4 model), `/predict` 200 (gambar bukan X-ray BENAR terdeteksi
  `is_ood: true` → `decision: "abstain"` — gerbang OOD terbukti bekerja
  dgn bobot asli, bukan cuma sintetis), `/explain` 200 (Grad-CAM PNG,
  latency turun dari ~4.3s ke ~0.6s setelah model ke-cache).

  **Dua bug ditemukan & diperbaiki lewat deploy pertama yang gagal:**
  1. `ModuleNotFoundError: pandas` — `src/fracture/data.py` masih
     `import pandas` di level modul (kelewat waktu TF dijadikan lazy
     sebelumnya), padahal `preprocess_image()` tidak butuh itu. Fix:
     `from __future__ import annotations` + lazy-import di
     `manifest_to_dataframe()` saja.
  2. `RiskCoveragePoint` field `threshold` (di `types.ts`/`schemas.py`)
     vs `abstain_band` (yang benar-benar dihasilkan
     `evaluate.py risk_coverage_curve()`) — dua nama utk hal sama, tidak
     pernah disatukan karena baru sekarang divalidasi lewat schema.
     Disatukan ke `abstain_band` (lebih akurat) di `schemas.py`+
     `types.ts`+`mocks/fixtures/metrics.ts`.

  **Efek samping penting (masih berlaku):** `src/fracture/data.py`
  `preprocess_image()` TIDAK memanggil TensorFlow langsung (Keras
  `convnext.preprocess_input` dikonfirmasi identity murni). Kalau asumsi
  ini pernah salah, `verify_prob_parity()` akan menangkapnya.

  **Belum ada:** `/health` belum mencerminkan progres unduh model
  (`status: "ready"` langsung — cold-start riil per-model belum
  tercermin di endpoint ini, meski unduhan GCS-nya sendiri sudah jalan).
  Autentikasi GCS container pakai default service account Compute Cloud
  Run (belum diaudit permission-nya secara eksplisit — cukup luas by
  default, perlu ditinjau kalau mau diperketat).

  **Juga diperbaiki:** `fracture-runs/large_789f2c2e/` (evidence yang
  ke-commit sebelumnya) ternyata STALE — hash config-nya tidak cocok
  dgn `configs/*.yaml` yang ada sekarang (`f6062dcc` yang benar). Isi
  status.json identik (bukan retraining ulang), cuma evidence salah
  alamat — sudah diganti ke `fracture-runs/large_f6062dcc/`.
- ✅ **[8] Integrasi web ke backend asli — LIVE, publik, teruji (2026-08-20).**
  `fracture.lapanproject.tech` sekarang: (1) **Basic Auth dicabut** —
  situs publik, `auth_basic`/`auth_basic_user_file` dihapus dari Nginx
  config; (2) **mock dimatikan** — `web/.env.production` diupdate
  (`VITE_API_BASE_URL`=URL Cloud Run, `VITE_USE_MOCKS=false`), build
  ulang, di-scp+extract ke `/var/www/fracture/dist` (pola manual biasa,
  RAM VPS 842MB tidak boleh `npm install`/`build` di server).

  **Bug ketemu saat deploy (root-cause dulu, bukan asal patch):**
  build production PERTAMA tetap membawa URL backend kosong + mock=true
  walau `.env.local` sudah diupdate — ternyata `web/.env.production`
  (file terpisah, di-commit sejak 14 Agustus, sengaja didesain menang
  di atas `.env.local` utk `npm run build`/mode production di Vite) yang
  belum diupdate. Diperbaiki, dibuktikan lewat grep bundle JS
  (`fracture-api-607128796608` benar-benar ada di
  `dist/assets/query-keys-*.js`) sebelum deploy.

  **CSP header di Nginx (`connect-src 'self'`) akan MEMBLOKIR fetch() ke
  backend origin berbeda** kalau tidak diupdate — ketahuan lewat baca
  config Nginx langsung sebelum deploy (bukan ketahuan belakangan dari
  situs rusak). Diperbaiki: `connect-src 'self' https://fracture-api-
  607128796608.asia-southeast2.run.app`. Hash CSP `script-src` (utk
  inline anti-FOUC script) dihitung ulang & dikonfirmasi TIDAK berubah
  (script anti-FOUC di `index.html` identik dgn build sebelumnya).

  **Diverifikasi live via curl** (bukan cuma "deployed", teruji fungsi):
  situs 200 tanpa auth, header CSP+security lengkap & benar, asset JS
  ter-hash baru bisa diakses, preflight CORS dari origin
  `fracture.lapanproject.tech` ke backend Cloud Run sukses (`allow-
  origin: *`), redirect HTTP->HTTPS masih jalan, teks "Mode demo" (dari
  `DemoModeBanner`, auto-hide saat `VITE_USE_MOCKS=false`, sudah didesain
  begini sejak awal) tidak ada lagi di bundle.

  Backup tersimpan di server sebelum overwrite: `/var/backups/fracture-
  dist-20260820-121030.tar.gz` + `fracture-nginx-20260820-121030.conf`
  (rollback kalau perlu).

  **Verifikasi visual sungguhan (2026-08-20, Playwright, bukan cuma
  curl):** upload citra fracture nyata dari `dataset/` di halaman
  Analyze -> **"Fractured" benar** (raw 0.997, terkalibrasi 98.8%,
  ConvNeXt-Small), Grad-CAM overlay TEPAT menyorot lokasi implan/fraktur
  di pergelangan kaki. Upload citra bukan-fracture -> **"Not Fractured"
  benar** (raw 0.034, terkalibrasi 6.8%). Halaman Compare (4 model
  sekaligus, termasuk trigger unduh GCS pertama kali utk Base 336MB &
  Large 752MB di instance ini) -> **keempat model konsisten "Fractured"**
  (Tiny 85.1%/902ms, Small 98.8%/1125ms, Base 99.9%/1278ms, Large
  99.9%/1701ms). Nol error console browser dari awal sampai akhir sesi.
- ⏳ **[6], [9]** — ablation CLAHE (di model terbaik saja — CI keempat
  model overlap semua, belum ada satu yang signifikan terbaik), figure
  publikasi.
- ⏳ **Belum diverifikasi ulang:** Grad-CAM parity (`verify_gradcam_parity`,
  fix bug forward-pass-ganda di commit `26c32da`) belum pernah dijalankan
  ulang dengan model sungguhan — `results/metrics.json` yang ter-commit
  masih pakai angka dari run SEBELUM fix (Tiny 4.75e-2, Small 2.6e-2,
  jauh di atas target 1e-4; Base/Large jauh lebih baik, 2e-3/1.4e-3).
  Tidak blocking untuk demo/deploy, tapi perlu diputuskan sebelum
  angka ini dipakai di laporan skripsi: re-run demi angka bersih, atau
  terima dgn catatan metodologis.

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
