import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function DisclaimerNote({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border border-warning/30 bg-surface-raised px-3 py-2.5',
        className,
      )}
    >
      <WarningCircle size={16} weight="regular" className="mt-0.5 shrink-0 text-warning" />
      <p className="font-body text-xs leading-relaxed text-text-muted">
        {compact ? (
          <>Alat bantu riset, <strong className="text-text">bukan alat diagnosis</strong>.</>
        ) : (
          <>
            Sistem ini adalah alat bantu riset klasifikasi citra, <strong className="text-text">bukan
            alat diagnosis medis</strong> dan belum tersertifikasi untuk penggunaan klinis. Setiap keputusan
            klinis tetap harus melalui radiolog atau tenaga medis berwenang.
          </>
        )}
      </p>
    </div>
  );
}
