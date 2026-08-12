# project-fracture-classification

Platform riset klasifikasi patah tulang dari citra X-ray (biner: fractured /
not fractured) memakai 4 varian ConvNeXt (Tiny, Small, Base, Large). Backend
rencana FastAPI + ONNX Runtime di Hugging Face Space (Docker, gratis),
frontend React di Vercel. Tanpa autentikasi, tanpa database — riwayat sesi
disimpan di `localStorage` browser.

**Sumber kebenaran tunggal:** `docs/superpowers/specs/2026-08-12-fracture-classification-design.md`
(bahasa Indonesia). Kontrak API di §9, requirement frontend di §10. Kalau ada
konflik antara dokumen ini dan spec, **spec yang menang** — dokumen ini
adalah ringkasan orientasi, bukan pengganti.

## Status saat ini (2026-08-13)

Mengikuti urutan eksekusi di spec §13:

- ✅ **[1] Scaffold frontend** — `web/` sudah jalan penuh di atas data mock
  (MSW), belum tersambung ke backend asli.
- ⏳ **[2] Audit dataset** — belum dikerjakan. Ini **gerbang**: menentukan
  apakah split train/val/test perlu dibuat ulang sebelum training, karena
  eksperimen lama (`data experiment/`) punya risiko kebocoran antar split
  yang belum diverifikasi.
- ⏳ **[3]–[9]** — retrain 4 model, evaluasi, ekspor ONNX, ablation CLAHE,
  backend FastAPI, integrasi web ke backend asli, figure publikasi — semua
  belum dikerjakan.

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
