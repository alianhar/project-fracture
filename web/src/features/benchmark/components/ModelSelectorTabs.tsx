import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MODEL_IDS, MODEL_LABELS } from '@/lib/constants';
import type { ModelId } from '@/lib/api/types';

interface ModelSelectorTabsProps {
  value: ModelId | 'all';
  onChange: (value: ModelId | 'all') => void;
  includeAll?: boolean;
}

export function ModelSelectorTabs({ value, onChange, includeAll = true }: ModelSelectorTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ModelId | 'all')}>
      <TabsList>
        {includeAll && <TabsTrigger value="all">Semua model</TabsTrigger>}
        {MODEL_IDS.map((id) => (
          <TabsTrigger key={id} value={id}>
            {MODEL_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
