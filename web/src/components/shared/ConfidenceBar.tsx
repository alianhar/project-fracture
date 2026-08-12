import { formatConfidence, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  rawProbability: number;
  calibratedProbability: number;
  positive?: boolean;
}

/** Bar horizontal — dua marker (mentah vs terkalibrasi), angka mono tabular. */
export function ConfidenceBar({ rawProbability, calibratedProbability, positive = true }: ConfidenceBarProps) {
  const barColor = positive ? 'bg-positive' : 'bg-negative';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono text-xs tabular-nums text-text-muted">
        <span>raw {formatConfidence(rawProbability)}</span>
        <span className="text-text">terkalibrasi {formatPercent(calibratedProbability)}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', barColor)}
          style={{ width: `${calibratedProbability * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-text-muted"
          style={{ left: `${rawProbability * 100}%` }}
          title={`Probabilitas mentah: ${formatConfidence(rawProbability)}`}
        />
      </div>
    </div>
  );
}
