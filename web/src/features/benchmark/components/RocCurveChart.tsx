import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModelMetrics } from '@/lib/api/types';
import { MODEL_CHART_COLORS, MODEL_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Menggabungkan roc_curve tiap model jadi satu array (sumbu fpr selaras
 * antar model karena fixture memakai grid titik yang sama). */
function mergeRocData(models: ModelMetrics[]) {
  const pointCount = models[0]?.roc_curve.length ?? 0;
  return Array.from({ length: pointCount }, (_, i) => {
    const row: Record<string, number> = { fpr: models[0].roc_curve[i].fpr };
    for (const m of models) row[m.model_id] = m.roc_curve[i]?.tpr ?? 0;
    return row;
  });
}

export function RocCurveChart({ models }: { models: ModelMetrics[] }) {
  const data = mergeRocData(models);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROC Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" />
            <XAxis
              dataKey="fpr"
              type="number"
              domain={[0, 1]}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -4, fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }}
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
            <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12 }} />
            {models.map((m) => (
              <Line
                key={m.model_id}
                type="monotone"
                dataKey={m.model_id}
                name={MODEL_LABELS[m.model_id]}
                stroke={MODEL_CHART_COLORS[m.model_id]}
                strokeWidth={1.75}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
