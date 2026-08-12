import { WarningCircle } from '@phosphor-icons/react';

export function AbstainWarning() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-surface-raised px-3 py-2.5">
      <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-warning" />
      <p className="font-body text-xs leading-relaxed text-text">
        Probabilitas berada di zona abu-abu dekat threshold — model{' '}
        <strong>tidak cukup yakin</strong> untuk memutuskan. Perlu review radiolog, bukan
        keputusan otomatis.
      </p>
    </div>
  );
}
