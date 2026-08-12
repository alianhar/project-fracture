import type { HistoryRecord } from '@/hooks/use-local-history';
import { HistoryRow } from './HistoryRow';

export function HistoryTable({ records }: { records: HistoryRecord[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {records.map((record) => (
        <HistoryRow key={record.id} record={record} />
      ))}
    </div>
  );
}
