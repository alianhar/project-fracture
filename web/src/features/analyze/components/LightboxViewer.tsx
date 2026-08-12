import { motion } from 'motion/react';
import { GradCamOverlay } from '@/components/shared/GradCamOverlay';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface LightboxViewerProps {
  imageUrl: string;
  heatmapBase64: string | null;
  opacity: number;
  isLoading: boolean;
}

/**
 * "Power-on" saat gambar di-drop — keyframe brightness/opacity solid warna,
 * BUKAN glow gradient berwarna. Vignette monokrom (--color-vignette) di
 * sekitar viewer, senada foto sungguhan, bukan efek dekoratif AI-slop.
 */
export function LightboxViewer({ imageUrl, heatmapBase64, opacity, isLoading }: LightboxViewerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, filter: 'brightness(0.3)' }}
      animate={{ opacity: 1, filter: 'brightness(1)' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-bg"
      style={{
        boxShadow: 'inset 0 0 60px 10px var(--color-vignette)',
      }}
    >
      <GradCamOverlay
        baseImageUrl={imageUrl}
        heatmapBase64={heatmapBase64}
        opacity={opacity}
        className="h-full w-full"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/40">
          <span className="font-mono text-xs tabular-nums text-text animate-pulse">memproses…</span>
        </div>
      )}
    </motion.div>
  );
}
