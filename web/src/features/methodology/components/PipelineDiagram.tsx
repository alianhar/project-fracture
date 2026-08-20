import { ArrowRight } from '@phosphor-icons/react';

const STEPS = [
  { title: 'Audit', desc: 'Deteksi duplikat & leakage antar split' },
  { title: 'Train', desc: 'Config identik, 4 arsitektur ConvNeXt' },
  { title: 'Calibrate', desc: 'Temperature scaling + bootstrap CI' },
  { title: 'Export', desc: 'ONNX, verifikasi parity Grad-CAM' },
  { title: 'Serve', desc: 'FastAPI di Google Cloud Run, gerbang OOD' },
];

/** Kotak flat + garis hairline — bukan diagram bergaya isometrik/gradient. */
export function PipelineDiagram() {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {STEPS.map((step, i) => (
        <div key={step.title} className="flex items-stretch gap-2">
          <div className="flex min-w-[140px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
            <p className="font-display text-xs font-semibold uppercase tracking-wide text-text">{step.title}</p>
            <p className="font-body text-[11px] leading-snug text-text-muted">{step.desc}</p>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex items-center text-text-muted">
              <ArrowRight size={14} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
