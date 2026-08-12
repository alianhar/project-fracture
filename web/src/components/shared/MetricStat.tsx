import type { ConfidenceInterval } from '@/lib/api/types';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MetricStatProps {
  label: string;
  ci: ConfidenceInterval;
  className?: string;
}

export function MetricStat({ label, ci, className }: MetricStatProps) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="font-body text-xs uppercase tracking-wide text-text-muted">{label}</p>
      {/* Angka besar tetap Montserrat (peran "display/angka besar" per desain
          token) — tabular-nums murni untuk perataan, bukan font mono penuh;
          JetBrains Mono dipakai sempit di tabel/sumbu chart, bukan di sini. */}
      <p className="font-display text-2xl font-semibold tabular-nums text-text">
        {formatPercent(ci.point, 1)}
      </p>
      <p className="font-mono text-[11px] tabular-nums text-text-muted">
        95% CI [{formatPercent(ci.lower, 1)}, {formatPercent(ci.upper, 1)}]
      </p>
    </div>
  );
}
