import { cn } from '@/lib/utils';

/**
 * Placeholder loading — opacity pulse polos, BUKAN shimmer gradient
 * (shimmer bergerak kiri-ke-kanan adalah salah satu ciri "AI slop" yang
 * dihindari secara eksplisit di project ini).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-surface-raised', className)}
      {...props}
    />
  );
}
