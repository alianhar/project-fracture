import { Info } from '@phosphor-icons/react';

/**
 * Selalu tampil selama build jalan di atas mock (VITE_USE_MOCKS=true) —
 * termasuk di deploy publik. Tujuannya eksplisit: siapa pun yang buka
 * fracture.lapanproject.tech (dosen, penguji, orang random) langsung tahu
 * seluruh prediksi & metrik di sini simulasi, BUKAN dari model terlatih.
 * Otomatis hilang begitu VITE_USE_MOCKS=false di .env.production (setelah
 * backend/model asli tersambung) — tidak perlu diingat untuk dihapus manual.
 */
export function DemoModeBanner() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5">
        <Info size={15} weight="bold" className="shrink-0 text-warning" />
        <p className="font-body text-xs text-text">
          <strong className="font-semibold">Mode demo</strong> — seluruh prediksi, Grad-CAM, dan metrik
          benchmark di situs ini <strong>disimulasikan</strong>. Model terlatih sungguhan belum tersambung;
          ini bukan hasil riset final.
        </p>
      </div>
    </div>
  );
}
