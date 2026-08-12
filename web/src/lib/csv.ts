import type { HistoryRecord } from '@/hooks/use-local-history';
import { formatDateTime } from './format';
import { MODEL_LABELS } from './constants';

const COLUMNS: { key: keyof HistoryRecord | 'model_label'; header: string }[] = [
  { key: 'timestampIso', header: 'Waktu' },
  { key: 'model_label', header: 'Model' },
  { key: 'decision', header: 'Keputusan' },
  { key: 'rawProbability', header: 'Probabilitas Mentah' },
  { key: 'calibratedProbability', header: 'Probabilitas Terkalibrasi' },
  { key: 'threshold', header: 'Threshold' },
  { key: 'fileName', header: 'Nama File' },
];

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportHistoryToCsv(records: HistoryRecord[]): void {
  const header = COLUMNS.map((c) => escapeCsvCell(c.header)).join(',');
  const rows = records.map((record) =>
    COLUMNS.map((c) => {
      if (c.key === 'model_label') return escapeCsvCell(MODEL_LABELS[record.modelId]);
      if (c.key === 'timestampIso') return escapeCsvCell(formatDateTime(record.timestampIso));
      const value = record[c.key as keyof HistoryRecord];
      return escapeCsvCell(String(value ?? ''));
    }).join(','),
  );
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fracture-dx-riwayat-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
