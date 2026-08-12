import { useState } from 'react';
import type { CompareModelResult } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelBadge } from '@/components/shared/LabelBadge';
import { ConfidenceBar } from '@/components/shared/ConfidenceBar';
import { GradCamOverlay } from '@/components/shared/GradCamOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MODEL_LABELS } from '@/lib/constants';
import { formatMs } from '@/lib/format';

interface ModelResultCardProps {
  imageUrl: string;
  result: CompareModelResult;
}

export function ModelResultCard({ imageUrl, result }: ModelResultCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{MODEL_LABELS[result.model_id]}</CardTitle>
        <span className="font-mono text-[11px] tabular-nums text-text-muted">{formatMs(result.latency_ms)}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" className="block aspect-square w-full overflow-hidden rounded-sm border border-border">
              <GradCamOverlay
                baseImageUrl={imageUrl}
                heatmapBase64={result.heatmap_png_base64}
                opacity={0.7}
                className="h-full w-full"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{MODEL_LABELS[result.model_id]} — Grad-CAM</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <GradCamOverlay
                baseImageUrl={imageUrl}
                heatmapBase64={result.heatmap_png_base64}
                opacity={0.7}
                className="aspect-square w-full rounded-sm"
              />
            </div>
          </DialogContent>
        </Dialog>

        <LabelBadge decision={result.decision} />
        <ConfidenceBar
          rawProbability={result.raw_probability}
          calibratedProbability={result.calibrated_probability}
          positive={result.decision !== 'not_fractured'}
        />
      </CardContent>
    </Card>
  );
}
