import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Empty state flat — nol ilustrasi blob, nol emoji. */
export function EmptyState({ icon: IconComponent, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-16 text-center">
      <IconComponent size={28} weight="thin" className="text-text-muted" />
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold text-text">{title}</p>
        {description && <p className="max-w-sm font-body text-xs text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
