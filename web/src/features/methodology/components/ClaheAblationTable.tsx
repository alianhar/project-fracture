import type { ClaheAblationResult } from '@/lib/api/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MODEL_LABELS } from '@/lib/constants';
import { formatCI } from '@/lib/format';

export function ClaheAblationTable({ ablation }: { ablation: ClaheAblationResult }) {
  const rows = [
    { label: 'Dengan CLAHE', data: ablation.with_clahe },
    { label: 'Tanpa CLAHE', data: ablation.without_clahe },
  ];

  return (
    <div className="space-y-2">
      <p className="font-body text-xs text-text-muted">
        Ablation dijalankan hanya pada model terbaik ({MODEL_LABELS[ablation.model_id]}) — bukan
        pada keempat model, sesuai spec §11.
      </p>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kondisi</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>F1</TableHead>
              <TableHead>AUROC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-body font-medium text-text">{row.label}</TableCell>
                <TableCell>{formatCI(row.data.accuracy.point, row.data.accuracy.lower, row.data.accuracy.upper)}</TableCell>
                <TableCell>{formatCI(row.data.f1.point, row.data.f1.lower, row.data.f1.upper)}</TableCell>
                <TableCell>{formatCI(row.data.auroc.point, row.data.auroc.lower, row.data.auroc.upper)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
