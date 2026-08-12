import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border border-border bg-surface-raised transition-colors',
        'data-[state=checked]:border-positive data-[state=checked]:bg-positive-dim',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-text-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-positive" />
    </SwitchPrimitive.Root>
  );
}
