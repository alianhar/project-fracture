import { Fragment, useState } from 'react';
import type { ModelId, ModelMetrics } from '@/lib/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModelSelectorTabs } from './ModelSelectorTabs';
import { findModel } from '../metrics-helpers';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

const CELLS: { key: 'tp' | 'fn' | 'fp' | 'tn'; row: string; col: string; tone: 'positive' | 'negative' | 'neutral' }[] = [
  { key: 'tp', row: 'Fractured', col: 'Fractured', tone: 'positive' },
  { key: 'fn', row: 'Fractured', col: 'Not Fractured', tone: 'neutral' },
  { key: 'fp', row: 'Not Fractured', col: 'Fractured', tone: 'neutral' },
  { key: 'tn', row: 'Not Fractured', col: 'Not Fractured', tone: 'negative' },
];

export function ConfusionMatrixInteractive({ models }: { models: ModelMetrics[] }) {
  const [selected, setSelected] = useState<ModelId>(models[0]?.model_id ?? 'small');
  const [hovered, setHovered] = useState<string | null>(null);
  const model = findModel(models, selected) ?? models[0];
  const total = model.test_set_size;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Confusion Matrix</CardTitle>
        <ModelSelectorTabs value={selected} onChange={(v) => v !== 'all' && setSelected(v)} includeAll={false} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-1 font-body text-xs">
          <div />
          <div className="px-2 py-1 text-center text-text-muted">Pred: Fractured</div>
          <div className="px-2 py-1 text-center text-text-muted">Pred: Not Fractured</div>

          {['Fractured', 'Not Fractured'].map((rowLabel) => (
            <Fragment key={rowLabel}>
              <div className="flex items-center px-2 text-text-muted">Actual: {rowLabel}</div>
              {CELLS.filter((c) => c.row === rowLabel).map((cell) => {
                const value = model.confusion_matrix[cell.key];
                const cellId = `${selected}-${cell.key}`;
                return (
                  <button
                    key={cellId}
                    type="button"
                    onMouseEnter={() => setHovered(cellId)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 rounded-sm border border-border px-3 py-4 transition-colors',
                      cell.tone === 'positive' && 'bg-positive-dim',
                      cell.tone === 'negative' && 'bg-negative-dim',
                      hovered === cellId && 'border-text-muted',
                    )}
                  >
                    <span className="font-mono text-lg font-semibold tabular-nums text-text">{value}</span>
                    <span className="font-mono text-[10px] tabular-nums text-text-muted">
                      {formatPercent(value / total, 1)}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
