import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getMetrics } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { PipelineDiagram } from './components/PipelineDiagram';
import { ClaheAblationTable } from './components/ClaheAblationTable';
import { LimitationsList } from './components/LimitationsList';
import { MedicalDisclaimer } from './components/MedicalDisclaimer';

export default function MethodologyPage() {
  const { data } = useQuery({ queryKey: queryKeys.metrics, queryFn: getMetrics });

  return (
    <PageContainer className="max-w-3xl">
      <div className="mb-8 space-y-1">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-text">Methodology</h1>
        <p className="font-body text-sm text-text-muted">
          Pipeline eksperimen, apa yang salah di percobaan awal, dan bagaimana itu diperbaiki.
        </p>
      </div>

      <div className="space-y-10">
        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text">Pipeline</h2>
          <PipelineDiagram />
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text">
            Analisis kegagalan eksperimen awal
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Preprocessing train ≠ test</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-sm leading-relaxed text-text-muted">
                Pada eksperimen awal, generator train/val memakai <code className="font-mono">rescale=1./255</code>{' '}
                (rentang [0,1]) sementara generator test memakai{' '}
                <code className="font-mono">convnext.preprocess_input</code> — yang ternyata fungsi kosong (no-op),
                karena normalisasi ConvNeXt sudah menjadi layer di dalam model. Tiga dari empat model diuji pada
                skala [0,255] padahal dilatih pada [0,1], membuat test accuracy jatuh ke ~0,5 (setara tebak koin)
                walau validation accuracy sempat 88–97%.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Perbandingan arsitektur tidak terkontrol</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-sm leading-relaxed text-text-muted">
                Preprocessing, learning rate, dan jumlah epoch berbeda bersamaan antar keempat model pada
                eksperimen awal — sehingga klaim "arsitektur X terbaik" tidak sah. Perbaikannya: satu konfigurasi
                terkunci (<code className="font-mono">configs/base.yaml</code>), hanya backbone yang bervariasi.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {data && (
          <section className="space-y-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text">
              Ablation Study — CLAHE
            </h2>
            <ClaheAblationTable ablation={data.clahe_ablation} />
          </section>
        )}
        {!data && <Skeleton className="h-32 w-full" />}

        <Separator />

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text">Keterbatasan</h2>
          <LimitationsList />
        </section>

        <Separator />

        <section>
          <MedicalDisclaimer />
        </section>
      </div>
    </PageContainer>
  );
}
