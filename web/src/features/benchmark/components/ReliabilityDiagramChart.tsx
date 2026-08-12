import { useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModelId, ModelMetrics } from '@/lib/api/types';
import { MODEL_CHART_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModelSelectorTabs } from './ModelSelectorTabs';
import { findModel } from '../metrics-helpers';

export function ReliabilityDiagramChart({ models }: { models: ModelMetrics[] }) {
  const [selected, setSelected] = useState<ModelId>(models[0]?.model_id ?? 'small');
  const model = findModel(models, selected) ?? models[0];

  const data = model.reliability_diagram.map((p) => ({
    confidence: p.bin_confidence,
    accuracy: p.bin_accuracy,
    count: p.bin_count,
  }));

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Reliability Diagram</CardTitle>
        <ModelSelectorTabs value={selected} onChange={(v) => v !== 'all' && setSelected(v)} includeAll={false} />
      </CardHeader>
      <CardContent>
        <p className="mb-2 font-mono text-xs tabular-nums text-text-muted">ECE = {model.ece.toFixed(3)}</p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" />
            <XAxis
              dataKey="confidence"
              type="number"
              domain={[0, 1]}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'Confidence', position: 'insideBottom', offset: -4, fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'Accuracy', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--color-border)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="accuracy" stroke={MODEL_CHART_COLORS[selected]} strokeWidth={2} dot={{ r: 3 }} />
            <Scatter dataKey="accuracy" fill={MODEL_CHART_COLORS[selected]} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
