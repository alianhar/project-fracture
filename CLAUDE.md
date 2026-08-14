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

## Status saat ini (2026-08-14)

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
  `src/fracture/data.py` (belum dibuat) wajib baca `split_manifest.json`,
  bukan struktur folder Kaggle.
- ⏳ **[3]–[9]** — retrain 4 model (pipeline/`configs/base.yaml` belum
  ditulis), evaluasi, ekspor ONNX, ablation CLAHE, backend FastAPI,
  integrasi web ke backend asli, figure publikasi — semua belum dikerjakan.

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
