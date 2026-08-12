interface GradCamOverlayProps {
  baseImageUrl: string;
  heatmapBase64: string | null;
  opacity: number;
  alt?: string;
  className?: string;
}

/**
 * Susunan dua layer: citra asli + heatmap Grad-CAM (PNG dengan alpha channel
 * kontinu — ini visualisasi data ilmiah, bukan hiasan UI). mix-blend-mode
 * "screen" supaya area panas menyala di atas X-ray gelap tanpa menghitamkan
 * bagian lain.
 */
export function GradCamOverlay({ baseImageUrl, heatmapBase64, opacity, alt = 'X-ray', className }: GradCamOverlayProps) {
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <img src={baseImageUrl} alt={alt} className="block h-full w-full object-contain" draggable={false} />
      {heatmapBase64 && (
        <img
          src={`data:image/png;base64,${heatmapBase64}`}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ opacity, mixBlendMode: 'screen' }}
        />
      )}
    </div>
  );
}
