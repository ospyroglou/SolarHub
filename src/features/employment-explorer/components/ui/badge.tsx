import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'neutral' | 'warn' | 'employee' | 'employer';

const VARIANTS: Record<Variant, string> = {
  neutral: 'bg-sh-sand text-sh-muted border-sh-rule',
  warn: 'bg-sh-warn-bg text-sh-ink border-sh-solar',
  employee: 'bg-sh-warn-bg text-sh-ink border-sh-employee',
  employer: 'bg-[#E4F0EE] text-sh-ink border-sh-employer',
};

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sh-tick font-medium',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
