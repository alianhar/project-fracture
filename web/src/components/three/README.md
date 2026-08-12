# Three.js — ditunda (deferred)

Diputuskan eksplisit lewat AskUserQuestion saat brainstorming (2026-08-13):
**Three.js tidak dibangun di pass scaffold ini.** Tidak ada `three` /
`@react-three/*` di `package.json` — jangan ditambahkan tanpa membuka
kembali keputusan ini dengan user.

## Rencana untuk pass berikutnya

Dua komponen didiskusikan dan disepakati arahnya, tinggal dieksekusi kapan
scope dibuka lagi:

1. **`AmbientWireframeSkeleton`** — model kerangka/tulang 3D wireframe yang
   berputar pelan di background hero halaman Analyze. Cyan tipis
   (`--color-text` / `--primitive-phosphor`) di atas latar gelap, murni
   ambient/dekoratif tapi bermakna (subjeknya memang tulang). Lazy-load
   hanya di route Analyze, tidak membebani route lain.

2. **`GradCamRelief3D`** — heatmap Grad-CAM diekstrusi jadi "relief" 3D di
   atas X-ray, area perhatian model menonjol seperti kontur peta. Terikat
   langsung ke output model asli (bukan dekorasi) — baru benar-benar
   bermakna setelah backend/model asli ada, bukan sekadar data mock.

Kedua komponen wajib lazy-loaded (code-split per route) dan menghormati
`prefers-reduced-motion` (fallback ke gambar statis, bukan dipaksa render
3D), konsisten dengan aturan animasi di seluruh project ini.
