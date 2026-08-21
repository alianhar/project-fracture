import { ArrowCounterClockwise, Scan } from '@phosphor-icons/react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { LightboxViewer } from './components/LightboxViewer';
import { SampleImages } from './components/SampleImages';
import { VerdictPanel } from './components/VerdictPanel';
import { useAnalyzeFlow } from './use-analyze-flow';
import { useHealthPoll } from '@/hooks/use-health-poll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DisclaimerNote } from '@/components/shared/DisclaimerNote';
import { EmptyState } from '@/components/shared/EmptyState';
import { MODEL_IDS, MODEL_LABELS } from '@/lib/constants';
import type { ModelId } from '@/lib/api/types';

export default function AnalyzePage() {
  const flow = useAnalyzeFlow();
  const { isReady } = useHealthPoll();

  return (
    <PageContainer>
      <div className="mb-6 space-y-1">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-text">Analyze</h1>
        <p className="font-body text-sm text-text-muted">
          Unggah satu citra X-ray untuk mendapatkan prediksi, probabilitas terkalibrasi, dan
          overlay Grad-CAM.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="font-body text-xs text-text-muted" htmlFor="model-select">
          Model
        </label>
        <Select value={flow.modelId} onValueChange={(v) => flow.setModelId(v as ModelId)}>
          <SelectTrigger id="model-select" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {MODEL_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {flow.file && (
          <Button variant="ghost" size="sm" onClick={flow.reset}>
            <ArrowCounterClockwise size={14} />
            Mulai ulang
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {!flow.imageUrl ? (
            <div className="space-y-4">
              <ImageDropzone onDrop={flow.runAnalysis} disabled={!isReady} />
              <SampleImages />
            </div>
          ) : (
            <LightboxViewer
              imageUrl={flow.imageUrl}
              heatmapBase64={flow.explainResult?.heatmap_png_base64 ?? null}
              opacity={flow.opacity}
              isLoading={flow.isBusy}
            />
          )}
        </div>

        <div className="space-y-4">
          {flow.predictResult ? (
            <VerdictPanel
              predict={flow.predictResult}
              threshold={flow.threshold}
              onThresholdChange={flow.setThreshold}
              opacity={flow.opacity}
              onOpacityChange={flow.setOpacity}
              explainLatencyMs={flow.explainResult?.latency_ms}
            />
          ) : flow.stage === 'error' ? (
            <EmptyState
              icon={Scan}
              title="Analisis gagal"
              description={
                flow.errorMessage
                  ? `Terjadi kesalahan: ${flow.errorMessage}`
                  : 'Terjadi kesalahan saat memproses citra. Coba unggah ulang.'
              }
            />
          ) : (
            <EmptyState
              icon={Scan}
              title="Belum ada citra"
              description="Hasil verdict, confidence, dan Grad-CAM akan muncul di sini setelah citra diunggah."
            />
          )}

          <DisclaimerNote />
        </div>
      </div>
    </PageContainer>
  );
}
