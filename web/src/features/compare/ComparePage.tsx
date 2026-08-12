import { ArrowsLeftRight } from '@phosphor-icons/react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { CompareGrid } from './components/CompareGrid';
import { useCompareFlow } from './use-compare-flow';
import { useHealthPoll } from '@/hooks/use-health-poll';

export default function ComparePage() {
  const { imageUrl, results, isLoading, isError, runCompare, reset } = useCompareFlow();
  const { isReady } = useHealthPoll();

  return (
    <PageContainer>
      <div className="mb-6 space-y-1">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-text">Compare</h1>
        <p className="font-body text-sm text-text-muted">
          Satu citra, dibandingkan pada keempat varian ConvNeXt sekaligus.
        </p>
      </div>

      {!imageUrl ? (
        <div className="mx-auto max-w-md">
          <ImageDropzone onDrop={runCompare} disabled={!isReady} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tabular-nums text-text-muted">
              {isLoading ? 'Menjalankan 4 model…' : `${results?.length ?? 0} model dibandingkan`}
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>
              Bandingkan citra lain
            </Button>
          </div>

          {isLoading && (
            <EmptyState icon={ArrowsLeftRight} title="Memproses…" description="Menjalankan keempat model secara paralel." />
          )}

          {isError && (
            <EmptyState icon={ArrowsLeftRight} title="Gagal membandingkan" description="Coba unggah ulang citra." />
          )}

          {results && <CompareGrid imageUrl={imageUrl} results={results} />}
        </div>
      )}
    </PageContainer>
  );
}
