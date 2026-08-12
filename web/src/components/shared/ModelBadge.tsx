import { MODEL_LABELS } from '@/lib/constants';
import type { ModelId } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function ModelBadge({ modelId, className }: { modelId: ModelId; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-text-muted',
        className,
      )}
    >
      {MODEL_LABELS[modelId]}
    </span>
  );
}
