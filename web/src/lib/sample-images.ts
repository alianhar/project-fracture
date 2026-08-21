/**
 * Citra contoh untuk halaman Analyze — diambil dari split TEST hasil audit dataset
 * (results/split_manifest.json, seed=42), jadi dijamin bukan bagian dari data yang
 * dipakai melatih model manapun (nol kebocoran by construction, lihat CLAUDE.md
 * bagian [2]). Diseleksi & disalin ke web/public/samples/ lewat script satu-kali —
 * bukan generated saat build, jadi daftar di sini harus disinkronkan manual kalau
 * set gambarnya diganti.
 */
export interface SampleImage {
  url: string;
  filename: string;
}

export const SAMPLE_IMAGES: { fractured: SampleImage[]; not_fractured: SampleImage[] } = {
  fractured: Array.from({ length: 8 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { url: `/samples/fractured/sample-${n}.jpg`, filename: `fracture-sample-${n}.jpg` };
  }),
  not_fractured: Array.from({ length: 8 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { url: `/samples/not_fractured/sample-${n}.jpg`, filename: `not-fractured-sample-${n}.jpg` };
  }),
};
