import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-body text-xs font-medium',
  {
    variants: {
      variant: {
        positive: 'border-positive/40 bg-positive-dim text-positive',
        negative: 'border-negative/40 bg-negative-dim text-negative',
        warning: 'border-warning/40 bg-transparent text-warning',
        neutral: 'border-border bg-transparent text-text-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
