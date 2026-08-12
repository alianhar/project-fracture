/** Butir-butir dari spec §15 — keterbatasan yang dinyatakan terbuka, apa adanya. */
const LIMITATIONS = [
  'Dataset berasal dari satu sumber; generalisasi lintas institusi belum diuji.',
  'Label bersifat biner; tipe fraktur dan lokasi anatomis tidak diprediksi.',
  'Sistem bersifat alat bantu penelitian, bukan alat diagnosis, dan tidak tersertifikasi untuk penggunaan klinis.',
  'Bila audit menemukan pembagian split bukan per-pasien, keterbatasan ini dinyatakan eksplisit meskipun split telah dibuat ulang.',
];

export function LimitationsList() {
  return (
    <ul className="space-y-2">
      {LIMITATIONS.map((item) => (
        <li key={item} className="flex gap-2 font-body text-sm text-text-muted">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
