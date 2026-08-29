/**
 * §6.0 — sticky filter bar. Sits below the hero in the document, so
 * position:sticky pins it to the top exactly when the hero scrolls past.
 * Contains the lens toggle, active-filter chips with "Clear all", the live
 * base indicator (never hidden), the filter-drawer trigger and the EN/TR
 * language toggle.
 */

import { SlidersHorizontal, X } from 'lucide-react';

import { useStrings } from '../i18n';
import { cn } from '../lib/cn';
import {
  activeFilterCount,
  EMPLOYEE_FILTERS,
  EMPLOYER_FILTERS,
  type FilterCategoryDef,
  type Lens,
} from '../lib/filters';
import { useFilters } from '../state/filter-context';
import { FilterDrawer } from './FilterDrawer';
import { Sheet, SheetTrigger } from './ui/sheet';

const LENSES: Lens[] = ['employees', 'employers', 'compare'];

export function FilterBar() {
  const { state, dispatch, employeeBase, employerBase } = useFilters();
  const t = useStrings(state.language);
  const lensLabels: Record<Lens, string> = {
    employees: t.lensEmployees,
    employers: t.lensEmployers,
    compare: t.lensCompare,
  };
  const filterCount = activeFilterCount(state);

  return (
    <div className="sticky top-0 z-30 border-b border-sh-rule bg-sh-surface">
      <div className="mx-auto flex max-w-sh-content flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        {/* Lens toggle */}
        <div
          role="group"
          aria-label="Lens"
          className="flex rounded-lg border border-sh-rule p-0.5"
        >
          {LENSES.map((lens) => (
            <button
              key={lens}
              type="button"
              aria-pressed={state.lens === lens}
              onClick={() => dispatch({ type: 'setLens', lens })}
              className={cn(
                'rounded-md px-3 py-1.5 text-sh-chart font-medium',
                state.lens === lens
                  ? 'bg-sh-deep text-sh-surface'
                  : 'text-sh-muted hover:text-sh-ink',
              )}
            >
              {lensLabels[lens]}
            </button>
          ))}
        </div>

        {/* Live base indicator — never hidden (§6.0). */}
        <p aria-live="polite" className="sh-num text-sh-chart font-medium text-sh-ink">
          {state.lens !== 'employers' && (
            <span
              className={cn(
                employeeBase.status === 'suppressed' && 'text-sh-alert',
              )}
            >
              <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-sh-employee align-middle" />
              {t.baseLabel(employeeBase.n, employeeBase.total)}
            </span>
          )}
          {state.lens === 'compare' && <span className="mx-2 text-sh-muted">{t.andConnector}</span>}
          {state.lens !== 'employees' && (
            <span
              className={cn(
                employerBase.status === 'suppressed' && 'text-sh-alert',
              )}
            >
              <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-sh-employer align-middle" />
              {t.baseLabel(employerBase.n, employerBase.total)}
            </span>
          )}
        </p>

        {/* Active filter chips */}
        <FilterChips />

        <div className="ml-auto flex items-center gap-2">
          {filterCount > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearAll' })}
              className="text-sh-chart text-sh-muted underline underline-offset-2 hover:text-sh-ink"
            >
              {t.clearAll}
            </button>
          ) : null}

          {/* Drawer trigger */}
          <Sheet>
            <SheetTrigger
              aria-label={t.openFilters}
              className="inline-flex items-center gap-1.5 rounded-md border border-sh-rule px-3 py-1.5 text-sh-chart font-medium text-sh-ink hover:border-sh-deep"
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              {t.filters}
              {filterCount > 0 ? (
                <span className="sh-num rounded-full bg-sh-deep px-1.5 text-[11px] font-semibold text-sh-surface">
                  {filterCount}
                </span>
              ) : null}
            </SheetTrigger>
            <FilterDrawer />
          </Sheet>

          {/* Language toggle */}
          <div role="group" aria-label={t.languageToggle} className="flex rounded-md border border-sh-rule p-0.5">
            {(['en', 'tr'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={state.language === lang}
                onClick={() => dispatch({ type: 'setLanguage', language: lang })}
                className={cn(
                  'rounded px-2 py-1 text-sh-tick font-semibold uppercase',
                  state.language === lang
                    ? 'bg-sh-deep text-sh-surface'
                    : 'text-sh-muted hover:text-sh-ink',
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChips() {
  const { state, dispatch } = useFilters();
  const t = useStrings(state.language);

  const chips: {
    dataset: 'employee' | 'employer';
    key: string;
    value: string;
    label: string;
  }[] = [];

  const collect = <R,>(
    dataset: 'employee' | 'employer',
    defs: FilterCategoryDef<R>[],
  ) => {
    for (const def of defs) {
      for (const value of state[dataset][def.key] ?? []) {
        const opt = def.options.find((o) => o.value === value);
        if (!opt) continue;
        chips.push({
          dataset,
          key: def.key,
          value,
          label: state.language === 'tr' ? opt.labelTr : opt.labelEn,
        });
      }
    }
  };
  collect('employee', EMPLOYEE_FILTERS);
  collect('employer', EMPLOYER_FILTERS);

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label={t.filters}>
      {chips.map((chip) => (
        <li key={`${chip.dataset}:${chip.key}:${chip.value}`}>
          <button
            type="button"
            aria-label={t.removeFilter(chip.label)}
            onClick={() =>
              dispatch({
                type: 'toggle',
                dataset: chip.dataset,
                key: chip.key,
                value: chip.value,
              })
            }
            className={cn(
              'inline-flex max-w-[220px] items-center gap-1 rounded-full border px-2.5 py-1 text-sh-tick',
              chip.dataset === 'employee'
                ? 'border-sh-employee bg-sh-warn-bg'
                : 'border-sh-employer bg-[#E4F0EE]',
            )}
          >
            <span className="truncate">{chip.label}</span>
            <X size={12} aria-hidden="true" className="shrink-0 text-sh-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}
