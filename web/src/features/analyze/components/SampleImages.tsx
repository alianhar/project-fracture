import { DownloadSimple } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_IMAGES, type SampleImage } from '@/lib/sample-images';

/**
 * Galeri citra contoh dari split TEST (nol kebocoran by construction, lihat
 * CLAUDE.md [2]) supaya user bisa coba sistem tanpa cari data X-ray sendiri.
 * Download-only (bukan one-click-load ke analyzer) -- keputusan eksplisit,
 * lihat riwayat percakapan 2026-08-21.
 */
function SampleGroup({ label, variant, items }: { label: string; variant: 'positive' | 'negative'; items: SampleImage[] }) {
  return (
    <div className="space-y-2">
      <Badge variant={variant} className="text-[11px]">
        {label}
      </Badge>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {items.map((img) => (
          <a
            key={img.url}
            href={img.url}
            download={img.filename}
            className="group relative block aspect-square overflow-hidden rounded-sm border border-border bg-surface"
            title={`Download ${img.filename}`}
          >
            <img src={img.url} alt={label} className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center bg-bg/70 opacity-0 transition-opacity group-hover:opacity-100">
              <DownloadSimple size={18} weight="bold" className="text-text" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function SampleImages() {
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface px-3 py-3">
      <div>
        <p className="font-body text-sm text-text">Belum punya citra X-ray?</p>
        <p className="font-body text-xs text-text-muted">
          Unduh salah satu contoh dari data uji (test set) — dijamin tidak pernah dipakai melatih
          model manapun.
        </p>
      </div>
      <SampleGroup label="Fractured" variant="positive" items={SAMPLE_IMAGES.fractured} />
      <SampleGroup label="Not Fractured" variant="negative" items={SAMPLE_IMAGES.not_fractured} />
    </div>
  );
}
