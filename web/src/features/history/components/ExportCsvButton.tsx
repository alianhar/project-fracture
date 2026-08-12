import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { HistoryRecord } from '@/hooks/use-local-history';
import { exportHistoryToCsv } from '@/lib/csv';

export function ExportCsvButton({ records }: { records: HistoryRecord[] }) {
  return (
    <Button variant="outline" size="sm" onClick={() => exportHistoryToCsv(records)} disabled={records.length === 0}>
      <DownloadSimple size={14} />
      Ekspor CSV
    </Button>
  );
}
