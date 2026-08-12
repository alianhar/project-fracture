import { ClockCounterClockwise } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { useLocalHistory } from '@/hooks/use-local-history';
import { ROUTES } from '@/lib/constants';
import { HistoryTable } from './components/HistoryTable';
import { ExportCsvButton } from './components/ExportCsvButton';
import { ClearHistoryButton } from './components/ClearHistoryButton';

export default function HistoryPage() {
  const records = useLocalHistory();

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-bold uppercase tracking-wide text-text">History</h1>
          <p className="font-body text-sm text-text-muted">
            Riwayat sesi ini, tersimpan lokal di browser — tidak dikirim ke server mana pun.
          </p>
        </div>
        {records.length > 0 && (
          <div className="flex items-center gap-2">
            <ExportCsvButton records={records} />
            <ClearHistoryButton />
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="Belum ada riwayat"
          description="Analisis pertamamu akan muncul di sini."
          action={
            <Button asChild size="sm">
              <Link to={ROUTES.analyze}>Mulai analisis</Link>
            </Button>
          }
        />
      ) : (
        <HistoryTable records={records} />
      )}
    </PageContainer>
  );
}
