/**
 * §6.10 — Growth outlook to 2035. Expected 2-year employment change as a
 * diverging stacked bar, the drivers behind it, and the technology areas
 * expected to carry employment toward 2035. Carries the executive-summary
 * correction: the printed "70% anticipate an increase of 25% or more" is
 * not supported by the data — the accurate split is shown with a neutral
 * reconciliation note.
 */

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { CategoryBarChartHorizontal, type CatDatum } from '../components/charts';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { optionsOf, type Language } from '../lib/data';
import { tallyCategory, tallyMulti } from '../lib/stats';
import { useFilters } from '../state/filter-context';

const COPY: Record<Language, {
  title: string;
  intro: string;
  changeTitle: string;
  driversTitle: string;
  areasTitle: string;
  correctionTitle: string;
  correction: (someInc: number, inc025: number, incOver: number) => string;
  correctionNote: string;
  driversFootnote: (incentives: number, investPct: number) => string;
}> = {
  en: {
    title: 'Growth outlook to 2035',
    intro:
      'What employers expect of their own headcount in the next two years, what drives that expectation, and where employment concentrates as the sector matures.',
    changeTitle: 'Expected change in employment volume over 2 years',
    driversTitle: 'Top 3 factors behind that expectation',
    areasTitle: 'Areas expected to drive employment toward 2035',
    correctionTitle: 'Correcting the executive summary',
    correction: (someInc, inc025, incOver) =>
      `The printed executive summary states "70% of employers anticipate an increase of 25% or more." The data: ${inc025}% expect 0–25% growth and ${incOver}% expect more than 25% — so ${someInc}% expect some increase; only ${incOver}% expect 25% or more.`,
    correctionNote:
      'The explorer presents the figures computed from the data; the printed phrasing differs, so both documents can be reconciled by anyone reading both.',
    driversFootnote: (incentives, investPct) =>
      `Investment speed dominates at ${investPct}%; the operation-and-maintenance option was selected by nobody. ${incentives} respondents additionally named investment incentives, outside the defined options (kept in the data's quarantine, not charted).`,
  },
  tr: {
    title: '2035’e doğru büyüme görünümü',
    intro:
      'İşverenlerin önümüzdeki iki yılda kendi istihdamlarından beklentisi, bu beklentiyi belirleyen etkenler ve sektör olgunlaştıkça istihdamın yoğunlaşacağı alanlar.',
    changeTitle: '2 yılda istihdam hacminde beklenen değişim',
    driversTitle: 'Bu beklentinin arkasındaki en önemli 3 faktör',
    areasTitle: '2035’e doğru istihdamı sürükleyecek alanlar',
    correctionTitle: 'Yönetici özetine düzeltme',
    correction: (someInc, inc025, incOver) =>
      `Basılı yönetici özeti "işverenlerin %70'i %25 veya üzeri artış öngörüyor" der. Veri: %${inc025} %0–25 artış, %${incOver} %25 üzeri artış bekliyor — yani %${someInc} bir artış bekliyor; %25 ve üzerini bekleyen yalnızca %${incOver}.`,
    correctionNote:
      'Gezgin verilerden hesaplanan rakamları gösterir; basılı ifade farklıdır — bu not iki belgeyi okuyan herkesin ikisini uzlaştırabilmesi içindir.',
    driversFootnote: (incentives, investPct) =>
      `Yatırım hızı %${investPct} ile baskın; işletme-bakım seçeneğini kimse işaretlemedi. ${incentives} katılımcı ayrıca tanımlı seçenekler dışında teşvikleri belirtti (verinin karantinasında tutulur, grafiklenmez).`,
  },
};

const CHANGE_COLORS: Record<string, string> = {
  increase_over_25: 'var(--sh-lik-5)',
  increase_0_25: 'var(--sh-lik-4)',
  stable: 'var(--sh-lik-3)',
  decrease_0_25: 'var(--sh-lik-2)',
  decrease_over_25: 'var(--sh-lik-1)',
};

export function GrowthOutlook() {
  const { state, filteredEmployers, employerBase } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  const dimmed = state.lens !== 'employers';
  const dimNote = state.lens === 'employees' ? t.dimmedEmployeeLens : t.dimmedCompareLens;
  const base = makeBase(filteredEmployers.length, employerBase.total);

  const label = (questionId: string, value: string) => {
    const opt = optionsOf(questionId).find((o) => o.value === value);
    return opt ? (state.language === 'tr' ? opt.labelTr : opt.labelEn) : value;
  };

  const change = tallyCategory(
    filteredEmployers,
    (r) => r.employment_change_2y,
    optionsOf('employment_change_2y').map((o) => o.value),
  );
  const pctOf = (value: string) =>
    Math.round(change.data.find((d) => d.value === value)?.pct ?? 0);
  const incOver = pctOf('increase_over_25');
  const inc025 = pctOf('increase_0_25');

  const drivers = tallyMulti(
    filteredEmployers,
    (r) => r.employment_change_drivers,
    optionsOf('employment_change_drivers').map((o) => o.value),
  );
  const driversData: CatDatum[] = drivers.data.map((d) => ({
    ...d,
    label: label('employment_change_drivers', d.value),
  }));
  const investPct = Math.round(
    drivers.data.find((d) => d.value === 'investment_speed')?.pct ?? 0,
  );
  const incentivesCount = filteredEmployers.filter((r) =>
    r._other.some((o) => o.question === 'employment_change_drivers' && o.valueTr === 'Teşvikler'),
  ).length;

  const areas = tallyMulti(
    filteredEmployers,
    (r) => r.growth_tech_areas,
    optionsOf('growth_tech_areas').map((o) => o.value),
  );
  const areasData: CatDatum[] = areas.data.map((d) => ({
    ...d,
    label: label('growth_tech_areas', d.value),
  }));

  const tableOf = (data: CatDatum[]): TableSpec => ({
    headers: [t.category, t.count, t.share],
    rows: data.map((d) => [d.label, d.count, `${Math.round(d.pct)}%`]),
  });

  return (
    <ModuleSection id="growth-outlook" title={c.title} intro={c.intro}>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard
                title={c.changeTitle}
                base={base}
                series="employer"
                table={{
                  headers: [t.category, t.count, t.share],
                  rows: change.data.map((d) => [
                    label('employment_change_2y', d.value),
                    d.count,
                    `${Math.round(d.pct)}%`,
                  ]),
                }}
                ariaLabel={`${c.changeTitle}: ${inc025}% expect 0–25% growth, ${incOver}% more (n = ${change.answered}).`}
              >
                <ChangeDivergingBar
                  segments={change.data}
                  n={change.answered}
                  label={(v) => label('employment_change_2y', v)}
                />
              </ChartCard>
            </div>
            {/* §6.10 executive-summary correction, visibly annotated. */}
            {base.status !== 'suppressed' && (
              <aside className="rounded-sh-card border p-5" style={{ borderColor: 'var(--sh-alert)' }}>
                <h4 className="text-sh-h4 text-sh-deep">{c.correctionTitle}</h4>
                <p className="mt-2 text-sh-chart leading-relaxed text-sh-ink">
                  {c.correction(incOver + inc025, inc025, incOver)}
                </p>
                <p className="mt-2 text-sh-tick text-sh-muted">{c.correctionNote}</p>
              </aside>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={c.driversTitle}
              base={base}
              series="employer"
              table={tableOf(driversData)}
              ariaLabel={`${c.driversTitle}: ${driversData[0]?.label ?? ''} ${investPct}%.`}
              footnote={c.driversFootnote(incentivesCount, investPct)}
            >
              <CategoryBarChartHorizontal data={driversData} color="var(--sh-employer)" activeValues={[]} labelWidth={210} />
            </ChartCard>
            <ChartCard
              title={c.areasTitle}
              base={base}
              series="employer"
              table={tableOf(areasData)}
              ariaLabel={`${c.areasTitle}.`}
            >
              <CategoryBarChartHorizontal data={areasData} color="var(--sh-employer)" activeValues={[]} labelWidth={210} />
            </ChartCard>
          </div>
        </div>
      </DimmablePanel>
    </ModuleSection>
  );
}

/** Diverging stacked bar for the 5 change categories, decline → growth. */
function ChangeDivergingBar({
  segments,
  n,
  label,
}: {
  segments: { value: string; count: number; pct: number }[];
  n: number;
  label: (value: string) => string;
}) {
  const W = 640;
  const BAR_H = 44;
  // Order left→right: strong decline → strong growth.
  const order = ['decrease_over_25', 'decrease_0_25', 'stable', 'increase_0_25', 'increase_over_25'];
  const ordered = order
    .map((v) => segments.find((s) => s.value === v)!)
    .filter(Boolean);
  let x = 0;
  const rects = ordered
    .filter((s) => s.count > 0)
    .map((s) => {
      const w = (s.pct / 100) * W;
      const r = { ...s, x, w: Math.max(w - 2, 0) };
      x += w;
      return r;
    });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${BAR_H + 26}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
        {rects.map((s) => (
          <g key={s.value}>
            <title>{`${label(s.value)}: ${Math.round(s.pct)}% (n = ${s.count}) · ${n}`}</title>
            <rect className="sh-anim" x={s.x} y={0} width={s.w} height={BAR_H} rx={4} fill={CHANGE_COLORS[s.value]} stroke="rgba(20,24,29,0.15)" strokeWidth={0.75} />
            {s.w > 36 && (
              <text x={s.x + s.w / 2} y={BAR_H / 2 + 4} fontSize={12} textAnchor="middle" fill={s.value === 'stable' ? 'var(--sh-ink)' : '#FFFFFF'} className="sh-num">
                {Math.round(s.pct)}%
              </text>
            )}
          </g>
        ))}
        <text x={0} y={BAR_H + 18} fontSize={11} fill="var(--sh-muted)">
          ← {label('decrease_over_25')}
        </text>
        <text x={W} y={BAR_H + 18} fontSize={11} textAnchor="end" fill="var(--sh-muted)">
          {label('increase_over_25')} →
        </text>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {ordered.map((s) => (
          <li key={s.value} className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm border border-sh-rule" style={{ backgroundColor: CHANGE_COLORS[s.value] }} />
            {label(s.value)}
            <span className="sh-num text-sh-muted">({s.count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
