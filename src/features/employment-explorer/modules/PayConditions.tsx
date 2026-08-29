/**
 * §6.5 — Pay and conditions. Wage comparison as a single 100% stacked bar
 * (one decimal, the report's own precision: 45.5 / 40.9 / 2.3), the three
 * pay Likert items as small-multiple diverging bars, and the callout on the
 * 25% undecided about field allowances. Cross-filtering by company size
 * arrives through the global filter state like every other module.
 */

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { DivergingLikertChart, LikertLegend } from '../components/DivergingLikert';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { optionLabel, type Language } from '../lib/data';
import { buildLikertItems, buildWageDistribution } from '../lib/module-data';
import { useFilters } from '../state/filter-context';
import type { EmployeeRecord, Likert } from '../../../types/survey';

const COPY: Record<Language, {
  title: string;
  intro: string;
  wageTitle: string;
  likertTitle: string;
  calloutTitle: string;
  callout: (pct: number, n: number) => string;
}> = {
  en: {
    title: 'Pay and conditions',
    intro:
      'How pay compares with other sectors, and how fairly employees feel treated on pay, rights and field allowances.',
    wageTitle: 'Solar sector pay compared with other sectors',
    likertTitle: 'Pay fairness, rights compliance and field allowances',
    calloutTitle: 'The undecided quarter',
    callout: (pct, n) =>
      `${pct}% (n = ${n}) are undecided on field allowances. The report reads this as satisfaction varying by destination, duration and subcontractor structure rather than a single sector-wide experience.`,
  },
  tr: {
    title: 'Ücret ve koşullar',
    intro:
      'Ücretlerin diğer sektörlerle karşılaştırması ve çalışanların ücret, haklar ve saha imkânları konusundaki adalet algısı.',
    wageTitle: 'Güneş sektörü ücretlerinin diğer sektörlerle karşılaştırması',
    likertTitle: 'Ücret adaleti, haklara uyum ve saha imkânları',
    calloutTitle: 'Kararsız çeyrek',
    callout: (pct, n) =>
      `Saha imkânları konusunda %${pct} (n = ${n}) kararsız. Rapor bunu, memnuniyetin destinasyona, süreye ve taşeron yapısına göre değişmesiyle açıklıyor.`,
  },
};

/** Amber ordinal ramp for lower→higher, muted for "not informed". */
const WAGE_COLORS: Record<string, string> = {
  lower: '#C78A00',
  similar: '#F2A900',
  higher: '#F6CE74',
  not_informed: 'var(--sh-muted)',
};
const WAGE_TEXT: Record<string, string> = {
  lower: '#FFFFFF',
  similar: 'var(--sh-ink)',
  higher: 'var(--sh-ink)',
  not_informed: '#FFFFFF',
};

const PAY_LIKERT_IDS = ['pay_fairness', 'rights_compliance', 'field_allowances'] as const;

export function PayConditions() {
  const { state, filteredEmployees, employeeBase } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  const dimmed = state.lens !== 'employees';
  const dimNote = state.lens === 'employers' ? t.dimmedEmployerLens : t.dimmedCompareLens;

  const wage = buildWageDistribution(filteredEmployees);
  const wageBase = makeBase(wage.n, employeeBase.total);

  const likertItems = buildLikertItems(
    filteredEmployees,
    PAY_LIKERT_IDS,
    (r, id) => r[id as keyof EmployeeRecord] as Likert,
    state.language,
  );
  const fieldAllowances = likertItems.find((i) => i.id === 'field_allowances');
  const neutralPct = fieldAllowances && fieldAllowances.summary.n > 0
    ? Math.round(fieldAllowances.summary.shares[2])
    : 0;
  const neutralCount = fieldAllowances?.summary.counts[2] ?? 0;

  const wageTable: TableSpec = {
    headers: [t.category, t.count, t.share],
    rows: wage.segments.map((s) => [
      optionLabel('wage_comparison', s.value, state.language),
      s.count,
      `${s.pct.toFixed(1)}%`,
    ]),
  };

  const likertTable: TableSpec = {
    headers: ['', '1', '2', '3', '4', '5', 'n'],
    rows: likertItems.map((i) => [i.label, ...i.summary.counts, i.summary.n]),
  };

  return (
    <ModuleSection id="pay-conditions" title={c.title} intro={c.intro}>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <div className="flex flex-col gap-6">
          <ChartCard
            title={c.wageTitle}
            base={wageBase}
            series="employee"
            table={wageTable}
            ariaLabel={`${c.wageTitle}: ${wage.segments
              .map(
                (s) => `${optionLabel('wage_comparison', s.value, state.language)} ${s.pct.toFixed(1)}%`,
              )
              .join(', ')} (n = ${wage.n}).`}
          >
            <WageStackedBar segments={wage.segments} n={wage.n} />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard
                title={c.likertTitle}
                base={makeBase(
                  Math.min(...likertItems.map((i) => i.summary.n)),
                  employeeBase.total,
                )}
                series="employee"
                table={likertTable}
                ariaLabel={`${c.likertTitle} (n = ${employeeBase.n}).`}
              >
                <DivergingLikertChart
                  items={likertItems}
                  scale="5"
                  showMean={false}
                  baseTotal={employeeBase.n}
                />
                <LikertLegend scale="5" />
              </ChartCard>
            </div>
            {/* §6.5 callout — computed live, suppressed with the base. */}
            {wageBase.status !== 'suppressed' && (
              <aside className="rounded-sh-card border border-sh-employee bg-sh-warn-bg p-5">
                <h4 className="text-sh-h4 text-sh-deep">{c.calloutTitle}</h4>
                <p className="mt-2 text-sh-chart leading-relaxed text-sh-ink">
                  {c.callout(neutralPct, neutralCount)}
                </p>
              </aside>
            )}
          </div>
        </div>
      </DimmablePanel>
    </ModuleSection>
  );
}

function WageStackedBar({
  segments,
  n,
}: {
  segments: { value: string; count: number; pct: number }[];
  n: number;
}) {
  const { state } = useFilters();
  const W = 760;
  const H = 100;
  const BAR_Y = 8;
  const BAR_H = 40;
  const GAP = 2;

  let x = 0;
  const rects = segments.map((s, i) => {
    const w = (s.pct / 100) * W;
    const r = { ...s, x, w: Math.max(w - (w > 0 ? GAP : 0), 0), row: i % 2 };
    x += w;
    return r;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
      {rects.map((s) => {
        const label = optionLabel('wage_comparison', s.value, state.language);
        return (
          <g key={s.value}>
            <title>{`${label}: ${s.pct.toFixed(1)}% (n = ${s.count}) · ${n}`}</title>
            <rect
              className="sh-anim"
              x={s.x}
              y={BAR_Y}
              width={s.w}
              height={BAR_H}
              rx={4}
              fill={WAGE_COLORS[s.value] ?? 'var(--sh-muted)'}
              stroke="rgba(20,24,29,0.15)"
              strokeWidth={0.75}
            />
            {s.w > 60 ? (
              <text
                x={s.x + s.w / 2}
                y={BAR_Y + BAR_H / 2 + 4}
                fontSize={12}
                textAnchor="middle"
                fill={WAGE_TEXT[s.value] ?? '#FFFFFF'}
                className="sh-num"
              >
                {`${s.pct.toFixed(1)}%`}
              </text>
            ) : null}
            {/* Below-bar label so every segment is identified without hover;
                staggered on two lines so narrow neighbours never collide. */}
            <text
              x={Math.min(Math.max(s.x + s.w / 2, 40), W - 60)}
              y={BAR_Y + BAR_H + (s.row === 0 ? 20 : 36)}
              fontSize={11}
              textAnchor="middle"
              fill="var(--sh-muted)"
            >
              {s.w > 60 ? label : s.count > 0 ? `${label} ${s.pct.toFixed(1)}%` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
