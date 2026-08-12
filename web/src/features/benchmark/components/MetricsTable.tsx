import type { ModelMetrics } from '@/lib/api/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MODEL_LABELS } from '@/lib/constants';
import { formatCI } from '@/lib/format';

const METRIC_COLUMNS: { key: keyof Pick<ModelMetrics, 'accuracy' | 'precision' | 'recall' | 'f1' | 'auroc' | 'auprc'>; label: string }[] = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1', label: 'F1' },
  { key: 'auroc', label: 'AUROC' },
  { key: 'auprc', label: 'AUPRC' },
];

export function MetricsTable({ models }: { models: ModelMetrics[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          {METRIC_COLUMNS.map((c) => (
            <TableHead key={c.key}>{c.label}</TableHead>
          ))}
          <TableHead>ECE</TableHead>
          <TableHead>OOD AUROC</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={m.model_id}>
            <TableCell className="font-body font-medium text-text">{MODEL_LABELS[m.model_id]}</TableCell>
            {METRIC_COLUMNS.map((c) => (
              <TableCell key={c.key}>{formatCI(m[c.key].point, m[c.key].lower, m[c.key].upper, 3)}</TableCell>
            ))}
            <TableCell>{m.ece.toFixed(3)}</TableCell>
            <TableCell>{m.ood_auroc.toFixed(3)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
