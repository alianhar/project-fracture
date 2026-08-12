import { WifiHigh } from '@phosphor-icons/react';
import { useHealthPoll } from '@/hooks/use-health-poll';
import { Progress } from '@/components/ui/progress';

/**
 * Status warm-up eksplisit — BUKAN spinner tanpa keterangan (spec §9/§10).
 * Space HF gratis butuh ~30-60 detik bangun dari cold start; mock fixture
 * di dev mensimulasikan versi lebih singkat (lihat mocks/fixtures/health.ts).
 */
export function ColdStartBanner() {
  const { data, isWarming } = useHealthPoll();

  if (!isWarming || !data) return null;

  const etaLabel = data.eta_s !== null ? `±${data.eta_s} detik` : 'sebentar lagi';
  const progressPct = data.eta_s !== null ? Math.max(4, 100 - data.eta_s * 3) : 50;

  return (
    <div className="border-b border-warning/30 bg-surface-raised px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <WifiHigh size={16} weight="regular" className="shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="font-body text-xs text-text">
            Menghangatkan model — estimasi <span className="font-mono tabular-nums">{etaLabel}</span>.
            Layanan gratis tidur setelah 48 jam tidak dipakai.
          </p>
          <Progress value={progressPct} className="mt-1.5 h-0.5" />
        </div>
      </div>
    </div>
  );
}
