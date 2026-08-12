import { Bone, Check, WarningCircle } from '@phosphor-icons/react';
import type { Decision } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';

const DECISION_META: Record<Decision, { label: string; variant: 'positive' | 'negative' | 'warning'; icon: typeof Bone }> = {
  fractured: { label: 'Fractured', variant: 'positive', icon: Bone },
  not_fractured: { label: 'Not Fractured', variant: 'negative', icon: Check },
  abstain: { label: 'Abstain — perlu review', variant: 'warning', icon: WarningCircle },
};

export function LabelBadge({ decision }: { decision: Decision }) {
  const meta = DECISION_META[decision];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="px-2.5 py-1 text-sm">
      <Icon size={14} weight="bold" />
      {meta.label}
    </Badge>
  );
}
