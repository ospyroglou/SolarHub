import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { useRevealOnScroll } from '../lib/hooks';

/**
 * Standard module shell: 1200px content grid, generous vertical separation
 * (§5.2), entry reveal on first scroll into view, once only (§5.3).
 */
export function ModuleSection({
  id,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  const { ref, revealed } = useRevealOnScroll<HTMLElement>();
  return (
    <section
      id={id}
      ref={ref}
      aria-labelledby={`${id}-title`}
      className={cn('sh-reveal mx-auto max-w-sh-content px-6 pt-sh-module', revealed && 'sh-revealed', className)}
    >
      <h2 id={`${id}-title`} className="text-sh-h2 tracking-tight text-sh-deep">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-2xl text-sh-body text-sh-muted">{intro}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * §6.0: under a lens that excludes a panel's dataset, the panel dims with a
 * short explanatory note instead of disappearing.
 */
export function DimmablePanel({
  dimmed,
  note,
  children,
  className,
}: {
  dimmed: boolean;
  note: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {dimmed ? (
        <p className="mb-3 rounded-md border border-sh-rule bg-sh-sand px-3 py-2 text-sh-tick text-sh-muted">
          {note}
        </p>
      ) : null}
      <div
        aria-disabled={dimmed || undefined}
        className={cn(dimmed && 'pointer-events-none opacity-40 select-none')}
      >
        {children}
      </div>
    </div>
  );
}
