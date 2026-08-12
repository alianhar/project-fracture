import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-px w-full grow bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-positive" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border-2 border-positive bg-bg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40" />
    </SliderPrimitive.Root>
  );
}
