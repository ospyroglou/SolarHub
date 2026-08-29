/**
 * §6.4 — Likert Explorer. All 13 employee and 6 employer Likert items as
 * diverging stacked bars centred on neutral. Controls: sort (net agreement
 * / question order / dimension), scale (full 5-point / collapsed 3-point),
 * dimension filter, mean markers. certificate_value carries its distinct
 * n = 35 base and a footnote — it never silently shares the 44 denominator.
 */

import { useMemo, useState } from 'react';

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { DivergingLikertChart, LikertLegend, type LikertScale } from '../components/DivergingLikert';
import { ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { cn } from '../lib/cn';
import type { Language } from '../lib/data';
import {
  buildLikertItems,
  EMPLOYEE_LIKERT_IDS,
  EMPLOYER_LIKERT_IDS,
  sortLikertItems,
  type LikertItem,
  type LikertSort,
} from '../lib/module-data';
import { useFilters } from '../state/filter-context';
import type { EmployeeRecord, EmployerRecord, Likert } from '../../../types/survey';

const COPY: Record<Language, {
  title: string;
  intro: string;
  sortLabel: string;
  sortNet: string;
  sortOrder: string;
  sortDimension: string;
  scale5: string;
  scale3: string;
  meanToggle: string;
  allDimensions: string;
  itemBaseNote: string;
  netHeader: string;
  meanHeader: string;
}> = {
  en: {
    title: 'Likert Explorer',
    intro:
      'Every agreement item in both questionnaires, centred on neutral. Sort, collapse the scale, or isolate a dimension.',
    sortLabel: 'Sort by',
    sortNet: 'Net agreement',
    sortOrder: 'Question order',
    sortDimension: 'Dimension',
    scale5: 'Full 5-point',
    scale3: 'Collapsed 3-point',
    meanToggle: 'Mean scores',
    allDimensions: 'All dimensions',
    itemBaseNote:
      '✳ Items answered by fewer respondents than the filtered base show their own n; percentages always use the item’s n.',
    netHeader: 'Net agreement',
    meanHeader: 'Mean',
  },
  tr: {
    title: 'Likert Gezgini',
    intro:
      'Her iki anketteki tüm katılım ifadeleri, kararsız merkezli. Sıralayın, ölçeği daraltın veya bir boyutu ayırın.',
    sortLabel: 'Sıralama',
    sortNet: 'Net katılım',
    sortOrder: 'Soru sırası',
    sortDimension: 'Boyut',
    scale5: 'Tam 5’li ölçek',
    scale3: 'Daraltılmış 3’lü',
    meanToggle: 'Ortalama puanlar',
    allDimensions: 'Tüm boyutlar',
    itemBaseNote:
      '✳ Filtrelenmiş tabandan daha az yanıtlanan maddeler kendi n değerini gösterir; yüzdeler her zaman maddenin n’ini kullanır.',
    netHeader: 'Net katılım',
    meanHeader: 'Ortalama',
  },
};

export function LikertExplorer() {
  const { state, filteredEmployees, filteredEmployers, employeeBase, employerBase } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  const [sort, setSort] = useState<LikertSort>('net');
  const [scale, setScale] = useState<LikertScale>('5');
  const [showMean, setShowMean] = useState(false);
  const [dimension, setDimension] = useState<string | null>(null);

  const employeeItems = useMemo(
    () =>
      buildLikertItems(
        filteredEmployees,
        EMPLOYEE_LIKERT_IDS,
        (r, id) => r[id as keyof EmployeeRecord] as Likert,
        state.language,
      ),
    [filteredEmployees, state.language],
  );
  const employerItems = useMemo(
    () =>
      buildLikertItems(
        filteredEmployers,
        EMPLOYER_LIKERT_IDS,
        (r, id) => r[id as keyof EmployerRecord] as Likert,
        state.language,
      ),
    [filteredEmployers, state.language],
  );

  const dimensions = [
    ...new Set([...employeeItems, ...employerItems].map((i) => i.dimension)),
  ];

  const prepare = (items: LikertItem[]) =>
    sortLikertItems(
      dimension ? items.filter((i) => i.dimension === dimension) : items,
      sort,
    );

  const showEmployee = state.lens !== 'employers';
  const showEmployer = state.lens !== 'employees';

  return (
    <ModuleSection id="likert-explorer" title={c.title} intro={c.intro}>
      {/* Shared controls */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Control label={c.sortLabel}>
          {(
            [
              ['net', c.sortNet],
              ['order', c.sortOrder],
              ['dimension', c.sortDimension],
            ] as [LikertSort, string][]
          ).map(([v, label]) => (
            <SegButton key={v} active={sort === v} onClick={() => setSort(v)}>
              {label}
            </SegButton>
          ))}
        </Control>
        <Control label="">
          <SegButton active={scale === '5'} onClick={() => setScale('5')}>
            {c.scale5}
          </SegButton>
          <SegButton active={scale === '3'} onClick={() => setScale('3')}>
            {c.scale3}
          </SegButton>
        </Control>
        <SegButton active={showMean} onClick={() => setShowMean((v) => !v)} standalone>
          {c.meanToggle}
        </SegButton>
        <label className="flex items-center gap-2 text-sh-tick text-sh-muted">
          {c.sortDimension}
          <select
            value={dimension ?? ''}
            onChange={(e) => setDimension(e.target.value || null)}
            className="rounded-md border border-sh-rule bg-sh-surface px-2 py-1 text-sh-tick text-sh-ink"
          >
            <option value="">{c.allDimensions}</option>
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={cn('grid gap-6', state.lens === 'compare' && 'xl:grid-cols-2')}>
        {showEmployee && (
          <LikertPanel
            heading={t.employeePanel}
            series="employee"
            items={prepare(employeeItems)}
            baseN={employeeBase.n}
            baseTotal={employeeBase.total}
            scale={scale}
            showMean={showMean}
            footnote={c.itemBaseNote}
          />
        )}
        {showEmployer && (
          <LikertPanel
            heading={t.employerPanel}
            series="employer"
            items={prepare(employerItems)}
            baseN={employerBase.n}
            baseTotal={employerBase.total}
            scale={scale}
            showMean={showMean}
          />
        )}
      </div>
    </ModuleSection>
  );
}

function LikertPanel({
  heading,
  series,
  items,
  baseN,
  baseTotal,
  scale,
  showMean,
  footnote,
}: {
  heading: string;
  series: 'employee' | 'employer';
  items: LikertItem[];
  baseN: number;
  baseTotal: number;
  scale: LikertScale;
  showMean: boolean;
  footnote?: string;
}) {
  const { state } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  // The lowest item n governs suppression, so a skip-heavy item can never
  // slip through the §7 gate.
  const minN = items.length > 0 ? Math.min(...items.map((i) => i.summary.n)) : baseN;
  const base = makeBase(Math.min(baseN, minN === Infinity ? baseN : minN), baseTotal);

  const table: TableSpec = {
    headers: ['', '1', '2', '3', '4', '5', 'n', c.netHeader, c.meanHeader],
    rows: items.map((i) => [
      i.label,
      ...i.summary.counts,
      i.summary.n,
      `${Math.round(i.net)} pts`,
      i.summary.mean ?? '—',
    ]),
  };

  const top = items[0];
  const aria = top
    ? `${heading}: ${items.length} items; highest net agreement ${top.label} (${Math.round(top.net)} points, n = ${top.summary.n}).`
    : `${heading}: no items under the current view.`;

  return (
    <ChartCard
      title={heading}
      base={base}
      series={series}
      table={table}
      ariaLabel={aria}
      footnote={footnote}
    >
      <DivergingLikertChart items={items} scale={scale} showMean={showMean} baseTotal={baseN} />
      <LikertLegend scale={scale} />
      {/* §6.4: certificate_value must carry its deviating base visibly. */}
      {items.some((i) => i.summary.n < baseN) && (
        <p className="mt-2 text-sh-tick text-sh-muted">{t.baseLabel(base.n, baseTotal)} ✳</p>
      )}
    </ChartCard>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="text-sh-tick text-sh-muted">{label}</span> : null}
      <div className="flex flex-wrap rounded-lg border border-sh-rule p-0.5">{children}</div>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
  standalone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  standalone?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-sh-tick font-medium',
        standalone && 'border border-sh-rule px-3 py-1.5',
        active ? 'bg-sh-deep text-sh-surface' : 'text-sh-muted hover:text-sh-ink',
      )}
    >
      {children}
    </button>
  );
}
