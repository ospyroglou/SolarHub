/**
 * Minimal shadcn-style Sheet on top of Radix Dialog, sliding in from the
 * right (§6.0 filter drawer). The portalled content carries the
 * `sh-explorer` class so the feature-scoped base styles apply inside the
 * portal too (§11: styling never leaks to, or depends on, the host page).
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  title,
  description,
  closeLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="sh-explorer fixed inset-0 z-40 bg-sh-ink/40" />
      <DialogPrimitive.Content
        className={cn(
          'sh-explorer fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto',
          'border-l border-sh-rule bg-sh-surface p-6 shadow-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-sh-h3 text-sh-deep">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sh-chart text-sh-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="rounded-md border border-sh-rule p-2 text-sh-muted hover:text-sh-ink"
          >
            <X size={16} aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <div className="mt-5 flex-1">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
