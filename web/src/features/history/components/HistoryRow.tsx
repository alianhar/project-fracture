import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import type { HistoryRecord } from '@/hooks/use-local-history';
import { LabelBadge } from '@/components/shared/LabelBadge';
import { ModelBadge } from '@/components/shared/ModelBadge';
import { formatConfidence, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export function HistoryRow({ record }: { record: HistoryRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-raised"
      >
        {record.thumbnailDataUrl ? (
          <img src={record.thumbnailDataUrl} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-sm bg-surface-raised" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-sm text-text">{record.fileName}</p>
          <p className="font-mono text-[11px] tabular-nums text-text-muted">
            {formatDateTime(record.timestampIso)}
          </p>
        </div>
        <ModelBadge modelId={record.modelId} />
        <LabelBadge decision={record.decision} />
        <CaretDown size={14} className={cn('shrink-0 text-text-muted transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface-raised px-3 py-3">
          {record.heatmapPngBase64 && record.thumbnailDataUrl && (
            <div className="relative h-24 w-24 overflow-hidden rounded-sm border border-border">
              <img src={record.thumbnailDataUrl} alt="" className="h-full w-full object-cover" />
              <img
                src={`data:image/png;base64,${record.heatmapPngBase64}`}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: 0.7, mixBlendMode: 'screen' }}
              />
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-text-muted">
            <dt>Raw</dt>
            <dd className="text-text">{formatConfidence(record.rawProbability)}</dd>
            <dt>Terkalibrasi</dt>
            <dd className="text-text">{formatConfidence(record.calibratedProbability)}</dd>
            <dt>Threshold</dt>
            <dd className="text-text">{formatConfidence(record.threshold, 2)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
