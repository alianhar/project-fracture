# Fracture.dx — Frontend

React + Vite + TypeScript frontend untuk platform riset klasifikasi patah
tulang. Lihat `CLAUDE.md` di root project untuk konteks lengkap, dan
`docs/superpowers/specs/2026-08-12-fracture-classification-design.md` untuk
spec otoritatif (kontrak API di §9, requirement frontend di §10).

## Menjalankan

```bash
npm install
npm run msw:init   # sekali di awal — generate public/mockServiceWorker.js
cp .env.example .env.local
npm run dev
```

Default (`VITE_USE_MOCKS=true`) menjalankan seluruh aplikasi di atas data
mock (MSW) — tidak butuh backend sama sekali. Untuk menyambungkan ke backend
FastAPI asli, set `VITE_API_BASE_URL` di `.env.local` dan `VITE_USE_MOCKS=false`.

## Perintah lain

```bash
npm run build     # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # preview hasil build
```

## Aturan desain (jangan dilanggar tanpa alasan kuat)

- **Tidak ada class Tailwind `dark:` di mana pun.** Tema 100% lewat atribut
  `data-theme` di `<html>` + CSS custom property (`src/styles/tokens.css`).
- Radius nyaris nol, hairline border (`--color-border`) menggantikan shadow.
- Montserrat = display/headline. Poppins = body/UI. JetBrains Mono = **hanya**
  untuk angka/data tabular.
- Tidak ada gradasi ungu-biru, glassmorphism, blob generik, ikon emoji.
- Tiga.js sengaja ditunda — lihat `src/components/three/README.md`.
