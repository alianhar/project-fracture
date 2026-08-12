import type { PredictResponse } from '@/lib/api/types';
import { LabelBadge } from '@/components/shared/LabelBadge';
import { ConfidenceBar } from '@/components/shared/ConfidenceBar';
import { ThresholdSlider, decisionFromThreshold } from '@/components/shared/ThresholdSlider';
import { OpacitySliderControl } from '@/components/shared/OpacitySliderControl';
import { AbstainWarning } from './AbstainWarning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatMs } from '@/lib/format';
import { ModelBadge } from '@/components/shared/ModelBadge';

interface VerdictPanelProps {
  predict: PredictResponse;
  threshold: number;
  onThresholdChange: (t: number) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  explainLatencyMs?: number;
}

export function VerdictPanel({
  predict,
  threshold,
  onThresholdChange,
  opacity,
  onOpacityChange,
  explainLatencyMs,
}: VerdictPanelProps) {
  const liveDecision = decisionFromThreshold(predict.calibrated_probability, threshold);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Verdict</CardTitle>
        <ModelBadge modelId={predict.model_id} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <LabelBadge decision={liveDecision} />
          <span className="font-mono text-xs tabular-nums text-text-muted">
            {formatMs(predict.latency_ms)}
            {explainLatencyMs ? ` + ${formatMs(explainLatencyMs)} explain` : ''}
          </span>
        </div>

        <ConfidenceBar
          rawProbability={predict.raw_probability}
          calibratedProbability={predict.calibrated_probability}
          positive={liveDecision !== 'not_fractured'}
        />

        {liveDecision === 'abstain' && <AbstainWarning />}

        {predict.is_ood && (
          <div className="rounded-md border border-danger/40 bg-surface-raised px-3 py-2 font-body text-xs text-danger">
            Citra terdeteksi di luar distribusi X-ray tulang (gerbang OOD) — hasil di atas
            mungkin tidak bermakna.
          </div>
        )}

        <Separator />

        <ThresholdSlider
          probability={predict.calibrated_probability}
          threshold={threshold}
          onThresholdChange={onThresholdChange}
        />

        <OpacitySliderControl value={opacity} onChange={onOpacityChange} />
      </CardContent>
    </Card>
  );
}
