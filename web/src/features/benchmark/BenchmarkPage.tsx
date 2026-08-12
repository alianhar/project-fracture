import { useQuery } from '@tanstack/react-query';
import { ChartBar } from '@phosphor-icons/react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { getMetrics } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { MetricsTable } from './components/MetricsTable';
import { RocCurveChart } from './components/RocCurveChart';
import { PrCurveChart } from './components/PrCurveChart';
import { ReliabilityDiagramChart } from './components/ReliabilityDiagramChart';
import { ConfusionMatrixInteractive } from './components/ConfusionMatrixInteractive';
import { RiskCoverageChart } from './components/RiskCoverageChart';
import { bestModelByAccuracy } from './metrics-helpers';

export default function BenchmarkPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: queryKeys.metrics, queryFn: getMetrics });

  return (
    <PageContainer>
      <div className="mb-6 space-y-1">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-text">Benchmark</h1>
        <p className="font-body text-sm text-text-muted">
          Seluruh angka di halaman ini dibangkitkan langsung dari <code className="font-mono">metrics.json</code>{' '}
          — tidak ada nilai yang ditulis manual.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {isError && (
        <EmptyState icon={ChartBar} title="Gagal memuat metrik" description="Coba muat ulang halaman." />
      )}

      {data && (
        <div className="space-y-8">
          <section className="overflow-hidden rounded-md border border-border">
            <MetricsTable models={data.models} />
          </section>

          <p className="font-mono text-[11px] tabular-nums text-text-muted">
            config_hash: {data.config_hash} · test set: {bestModelByAccuracy(data.models).test_set_size} citra ·
            digenerate {new Date(data.generated_at).toLocaleString('id-ID')}
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RocCurveChart models={data.models} />
            <PrCurveChart models={data.models} />
          </div>

          <ReliabilityDiagramChart models={data.models} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ConfusionMatrixInteractive models={data.models} />
            <RiskCoverageChart models={data.models} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
