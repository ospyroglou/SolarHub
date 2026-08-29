import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Checkbox({
  checked,
  onCheckedChange,
  id,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className={cn(
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border',
        checked ? 'border-sh-deep bg-sh-deep' : 'border-sh-rule bg-sh-surface',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={13} strokeWidth={3} className="text-sh-surface" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
