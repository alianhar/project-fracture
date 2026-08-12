import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ModelMetrics } from '@/lib/api/types';
import { MODEL_CHART_COLORS, MODEL_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function mergeRiskCoverageData(models: ModelMetrics[]) {
  const pointCount = models[0]?.risk_coverage_curve.length ?? 0;
  return Array.from({ length: pointCount }, (_, i) => {
    const row: Record<string, number> = { coverage: models[0].risk_coverage_curve[i].coverage };
    for (const m of models) row[m.model_id] = m.risk_coverage_curve[i]?.risk ?? 0;
    return row;
  });
}

export function RiskCoverageChart({ models }: { models: ModelMetrics[] }) {
  const data = mergeRiskCoverageData(models);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk–Coverage Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2 font-body text-xs text-text-muted">
          Selective prediction — makin sedikit abstain (coverage tinggi), makin tinggi risiko sisa.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" />
            <XAxis
              dataKey="coverage"
              type="number"
              domain={[0.5, 1]}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'Coverage', position: 'insideBottom', offset: -4, fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
            <YAxis
              type="number"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border)"
              label={{ value: 'Risk', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
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
