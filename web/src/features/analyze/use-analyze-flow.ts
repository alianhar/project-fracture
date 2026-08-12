import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postExplain, postPredict } from '@/lib/api/endpoints';
import type { ExplainResponse, ModelId, PredictResponse } from '@/lib/api/types';
import { DEFAULT_THRESHOLD } from '@/lib/constants';
import { appendHistoryRecord, createThumbnailDataUrl } from '@/hooks/use-local-history';

export type AnalyzeStage = 'idle' | 'predicting' | 'explaining' | 'done' | 'error';

export function useAnalyzeFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [modelId, setModelId] = useState<ModelId>('small');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [opacity, setOpacity] = useState(0.75);
  const [predictResult, setPredictResult] = useState<PredictResponse | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainResponse | null>(null);
  const [stage, setStage] = useState<AnalyzeStage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const predictMutation = useMutation({ mutationFn: (f: File) => postPredict(f, modelId, threshold) });
  const explainMutation = useMutation({ mutationFn: (f: File) => postExplain(f, modelId) });

  const runAnalysis = useCallback(
    async (newFile: File) => {
      const url = URL.createObjectURL(newFile);
      setFile(newFile);
      setImageUrl(url);
      setPredictResult(null);
      setExplainResult(null);
      setErrorMessage(null);
      setStage('predicting');

      try {
        const predict = await predictMutation.mutateAsync(newFile);
        setPredictResult(predict);
        setStage('explaining');

        const explain = await explainMutation.mutateAsync(newFile);
        setExplainResult(explain);
        setStage('done');

        const thumbnail = await createThumbnailDataUrl(newFile);
        appendHistoryRecord({
          modelId,
          fileName: newFile.name,
          decision: predict.decision,
          rawProbability: predict.raw_probability,
          calibratedProbability: predict.calibrated_probability,
          threshold: predict.threshold,
          thumbnailDataUrl: thumbnail,
          heatmapPngBase64: explain.heatmap_png_base64,
        });
      } catch (err) {
        console.error('[Analyze] gagal memproses citra:', err);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStage('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modelId, threshold],
  );

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setPredictResult(null);
    setExplainResult(null);
    setStage('idle');
  }, [imageUrl]);

  /** Keputusan live saat threshold digeser — recompute client, tanpa refetch. */
  const liveThreshold = threshold;

  return useMemo(
    () => ({
      file,
      imageUrl,
      modelId,
      setModelId,
      threshold: liveThreshold,
      setThreshold,
      opacity,
      setOpacity,
      predictResult,
      explainResult,
      stage,
      errorMessage,
      isBusy: stage === 'predicting' || stage === 'explaining',
      runAnalysis,
      reset,
    }),
    [
      file,
      imageUrl,
      modelId,
      liveThreshold,
      opacity,
      predictResult,
      explainResult,
      stage,
      errorMessage,
      runAnalysis,
      reset,
    ],
  );
}
