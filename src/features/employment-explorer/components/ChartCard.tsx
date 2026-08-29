/**
 * The module/chart wrapper every visual renders through. It is the single
 * enforcement point for the §7 integrity rules — no chart bypasses it:
 *
 *  - always shows the base ("n = X of Y", never hidden, item-specific);
 *  - suppresses the entire visual (and its table — same small cells) when
 *    the base falls below 5, with the §7 message;
 *  - shows the amber "Small base — indicative only" badge for 5 ≤ n ≤ 15;
 *  - provides the §8 "View as table" alternative for every chart.
 */

import { Table2, BarChart3 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { useStrings } from '../i18n';
import type { BaseInfo } from '../lib/base-count';
import { cn } from '../lib/cn';
import { useFilters } from '../state/filter-context';
import { Badge } from './ui/badge';

export interface TableSpec {
  headers: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  base,
  table,
  children,
  ariaLabel,
  footnote,
  className,
  series,
}: {
  title: string;
  /** Item-specific base under the active filter (§7). */
  base: BaseInfo;
  /** Figures behind the current view, for the table toggle (§8). */
  table: TableSpec;
  children: ReactNode;
  /** Accessible summary of the finding (§8). */
  ariaLabel: string;
  footnote?: string;
  className?: string;
  /** Colours the base badge by dataset. */
  series?: 'employee' | 'employer';
}) {
  const { state } = useFilters();
  const t = useStrings(state.language);
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  const suppressed = base.status === 'suppressed';

  return (
    <figure
      aria-labelledby={headingId}
      className={cn(
        'rounded-sh-card border border-sh-rule bg-sh-surface p-5',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={headingId} className="text-sh-h4 text-sh-deep">
          {title}
        </h4>
        <span className="flex items-center gap-2">
          {base.status === 'warn' ? (
            <Badge variant="warn">{t.smallBase}</Badge>
          ) : null}
          <Badge variant={series ?? 'neutral'} className="sh-num">
            {t.baseLabel(base.n, base.total)}
          </Badge>
          {!suppressed ? (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              className="inline-flex items-center gap-1 rounded-md border border-sh-rule px-2 py-1 text-sh-tick text-sh-muted hover:text-sh-ink"
            >
              {showTable ? (
                <BarChart3 size={13} aria-hidden="true" />
              ) : (
                <Table2 size={13} aria-hidden="true" />
              )}
              {showTable ? t.viewAsChart : t.viewAsTable}
            </button>
          ) : null}
        </span>
      </figcaption>

      <div className="mt-4">
        {suppressed ? (
          <p
            role="status"
            className="rounded-md border border-dashed border-sh-rule bg-sh-sand px-4 py-8 text-center text-sh-body text-sh-muted"
          >
            {t.suppressed}
          </p>
        ) : showTable ? (
          <DataTable table={table} />
        ) : (
          <div role="img" aria-label={ariaLabel}>
            {children}
          </div>
        )}
      </div>

      {footnote && !suppressed ? (
        <p className="mt-3 text-sh-tick text-sh-muted">{footnote}</p>
      ) : null}
    </figure>
  );
}

function DataTable({ table }: { table: TableSpec }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sh-chart">
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  'border-b border-sh-rule px-2 py-1.5 font-semibold text-sh-deep',
                  i === 0 ? 'text-left' : 'text-right',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'border-b border-sh-rule px-2 py-1.5',
                    ci === 0 ? 'text-left' : 'sh-num text-right',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
