import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 font-body text-sm text-text',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-focus',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <CaretDown size={14} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn('z-50 overflow-hidden rounded-md border border-border bg-surface-raised', className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 font-body text-sm text-text outline-none',
        'data-[highlighted]:bg-surface data-[highlighted]:text-positive',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 inline-flex items-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={14} weight="bold" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
