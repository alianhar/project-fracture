import { Slider } from '@/components/ui/slider';
import { LabelBadge } from './LabelBadge';
import type { Decision } from '@/lib/api/types';

interface ThresholdSliderProps {
  probability: number;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  abstainBand?: number;
}

export function decisionFromThreshold(probability: number, threshold: number, abstainBand = 0.04): Decision {
  if (Math.abs(probability - threshold) < abstainBand) return 'abstain';
  return probability >= threshold ? 'fractured' : 'not_fractured';
}

/**
 * Menggeser slider ini TIDAK memanggil ulang API — keputusan dihitung ulang
 * di client dari probabilitas yang sudah ada (spec §10: "live re-decision").
 */
export function ThresholdSlider({ probability, threshold, onThresholdChange, abstainBand = 0.04 }: ThresholdSliderProps) {
  const liveDecision = decisionFromThreshold(probability, threshold, abstainBand);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-body text-xs text-text-muted">
        <label htmlFor="decision-threshold">Threshold keputusan</label>
        <span className="font-mono tabular-nums">{threshold.toFixed(2)}</span>
      </div>
      <Slider
        id="decision-threshold"
        value={[threshold]}
        min={0.05}
        max={0.95}
        step={0.01}
        onValueChange={([v]) => onThresholdChange(v)}
      />
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-text-muted">Keputusan pada threshold ini:</span>
        <LabelBadge decision={liveDecision} />
      </div>
    </div>
  );
}
