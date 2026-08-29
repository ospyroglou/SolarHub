/**
 * §6.9 — Turnover and retention friction. NONE of this appears in the
 * published report; the whole module sits behind FEATURES.turnoverModule
 * (default OFF) pending authorial clearance — see lib/features.ts. The
 * module is labelled as extending beyond the published report, and per §7
 * exposes no employer verbatim text and no record-level view.
 */

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { CategoryBarChartHorizontal, CategoryDonut, type CatDatum } from '../components/charts';
import { Heatmap } from '../components/Heatmap';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { optionsOf, type Language } from '../lib/data';
import {
  buildBandMatrix,
  TURNOVER_BAND_VALUES,
  TURNOVER_ROWS,
} from '../lib/module-data';
import { tallyCategory, tallyMulti } from '../lib/stats';
import { useFilters } from '../state/filter-context';

const TEAL_RAMP_5 = ['#BFDEDA', '#9CC8C2', '#7FB2A6', '#4A9992', '#1B7F79'];

const COPY: Record<Language, {
  title: string;
  intro: string;
  unpublished: string;
  turnoverTitle: string;
  hardestTitle: string;
  barriersTitle: string;
  resignationTitle: string;
  volumeTitle: string;
  volumeIntro: string;
  turnoverRows: string[];
  turnoverBands: string[];
  firms: string;
}> = {
  en: {
    title: 'Turnover and retention friction',
    intro:
      'Where people churn, which roles are hardest to fill, and whether growth still produces jobs.',
    unpublished: 'Previously unpublished — extends beyond the printed report',
    turnoverTitle: 'Annual average turnover by staff group',
    hardestTitle: 'Position group hardest to fill',
    barriersTitle: 'Top 3 barriers in technical recruitment',
    resignationTitle: 'Dominant reason given by resigning staff',
    volumeTitle: 'Business volume vs headcount over 3 years',
    volumeIntro: 'The decoupling story: whether growth still produces jobs.',
    turnoverRows: [
      'Managers & strategic planning',
      'Project specialists / engineers',
      'R&D engineers',
      'Project technical personnel',
      'Entry-level engineers',
      'Technicians & operators',
      'Field workers (unskilled)',
      'Administrative personnel',
    ],
    turnoverBands: ['0–10%', '11–20%', '21–30%', '31–40%', 'Over 41%'],
    firms: 'firms',
  },
  tr: {
    title: 'Personel devri ve bağlılık sürtünmesi',
    intro:
      'Devrin yoğunlaştığı gruplar, doldurulması en zor roller ve büyümenin hâlâ istihdam üretip üretmediği.',
    unpublished: 'Daha önce yayımlanmadı — basılı raporun ötesine geçer',
    turnoverTitle: 'Çalışan grubuna göre yıllık ortalama devir',
    hardestTitle: 'Nitelikli aday bulunması en zor pozisyon',
    barriersTitle: 'Teknik alımda en önemli 3 engel',
    resignationTitle: 'İstifa edenlerin baskın gerekçesi',
    volumeTitle: '3 yılda iş hacmi ve personel sayısı',
    volumeIntro: 'Ayrışma hikâyesi: büyüme hâlâ istihdam üretiyor mu?',
    turnoverRows: [
      'Yönetici ve strateji planlama',
      'Proje uzmanı / mühendis',
      'Ar-Ge mühendisleri',
      'Proje teknik personeli',
      'Giriş seviyesi mühendisler',
      'Teknisyen ve operatörler',
      'Saha elemanı (vasıfsız)',
      'İdari personel',
    ],
    turnoverBands: ['%0–10', '%11–20', '%21–30', '%31–40', '%41 üzeri'],
    firms: 'firma',
  },
};

/** Diverging semantics for the §6.9 volume↔headcount stacked bar. */
const VOLUME_COLORS: Record<string, string> = {
  rose_together: 'var(--sh-lik-5)',
  volume_rose_headcount_flat_fell: 'var(--sh-lik-4)',
  flat_flat_rose: 'var(--sh-lik-3)',
  flat_fell: 'var(--sh-lik-2)',
  fell_flat_rose: 'var(--sh-lik-2)',
  fell_together: 'var(--sh-lik-1)',
};

export function TurnoverRetention() {
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

  const turnoverMatrix = buildBandMatrix(filteredEmployers, [...TURNOVER_ROWS], [...TURNOVER_BAND_VALUES]);

  const hardest = tallyCategory(
    filteredEmployers,
    (r) => r.hardest_role,
    optionsOf('hardest_role').map((o) => o.value),
  );
  const hardestData: CatDatum[] = hardest.data.map((d) => ({
    ...d,
    label: label('hardest_role', d.value),
  }));

  const barriers = tallyMulti(
    filteredEmployers,
    (r) => r.recruitment_barriers,
    optionsOf('recruitment_barriers').map((o) => o.value),
  );
  const barriersData: CatDatum[] = barriers.data.map((d) => ({
    ...d,
    label: label('recruitment_barriers', d.value),
  }));

  const resignation = tallyCategory(
    filteredEmployers,
    (r) => r.resignation_reason,
    optionsOf('resignation_reason').map((o) => o.value),
  );
  const resignationData: CatDatum[] = resignation.data.map((d) => ({
    ...d,
    label: label('resignation_reason', d.value),
  }));

  const volume = tallyCategory(
    filteredEmployers,
    (r) => r.volume_headcount_relation,
    optionsOf('volume_headcount_relation').map((o) => o.value),
  );

  const tableOf = (data: CatDatum[]): TableSpec => ({
    headers: [t.category, t.count, t.share],
    rows: data.map((d) => [d.label, d.count, `${Math.round(d.pct)}%`]),
  });

  return (
    <ModuleSection id="turnover-retention" title={c.title} intro={c.intro}>
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sh-alert px-3 py-1 text-sh-tick font-semibold text-sh-alert">
        ⚑ {c.unpublished}
      </p>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <div className="flex flex-col gap-6">
          <ChartCard
            title={c.turnoverTitle}
            base={base}
            series="employer"
            table={{
              headers: ['', ...c.turnoverBands],
              rows: TURNOVER_ROWS.map((_, r) => [c.turnoverRows[r] ?? '', ...(turnoverMatrix.counts[r] ?? [])]),
            }}
            ariaLabel={`${c.turnoverTitle} (n = ${base.n}).`}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <Heatmap
                  matrix={turnoverMatrix}
                  rowLabels={c.turnoverRows}
                  colLabels={c.turnoverBands}
                  tooltip={(row, col, count) => `${row} · ${col}: ${count} ${c.firms}`}
                />
              </div>
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={c.hardestTitle}
              base={base}
              series="employer"
              table={tableOf(hardestData)}
              ariaLabel={`${c.hardestTitle}: ${hardestData[0]?.label ?? ''}.`}
            >
              <CategoryBarChartHorizontal data={hardestData} color="var(--sh-employer)" activeValues={[]} labelWidth={210} />
            </ChartCard>
            <ChartCard
              title={c.barriersTitle}
              base={base}
              series="employer"
              table={tableOf(barriersData)}
              ariaLabel={`${c.barriersTitle}.`}
            >
              <CategoryBarChartHorizontal data={barriersData} color="var(--sh-employer)" activeValues={[]} labelWidth={210} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={c.resignationTitle}
              base={base}
              series="employer"
              table={tableOf(resignationData)}
              ariaLabel={`${c.resignationTitle}: ${resignationData[0]?.label ?? ''}.`}
            >
              <CategoryDonut data={resignationData} ramp={TEAL_RAMP_5} activeValues={[]} />
            </ChartCard>
            <ChartCard
              title={c.volumeTitle}
              base={base}
              series="employer"
              table={{
                headers: [t.category, t.count, t.share],
                rows: volume.data.map((d) => [
                  label('volume_headcount_relation', d.value),
                  d.count,
                  `${Math.round(d.pct)}%`,
                ]),
              }}
              ariaLabel={`${c.volumeTitle}.`}
              footnote={c.volumeIntro}
            >
              <VolumeStackedBar
                segments={volume.data}
                n={volume.answered}
                label={(v) => label('volume_headcount_relation', v)}
              />
            </ChartCard>
          </div>
        </div>
      </DimmablePanel>
    </ModuleSection>
  );
}

/** 100% stacked horizontal bar with diverging colours and a full legend. */
function VolumeStackedBar({
  segments,
  n,
  label,
}: {
  segments: { value: string; count: number; pct: number }[];
  n: number;
  label: (value: string) => string;
}) {
  const W = 560;
  const BAR_H = 40;
  let x = 0;
  const rects = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const w = (s.pct / 100) * W;
      const r = { ...s, x, w: Math.max(w - 2, 0) };
      x += w;
      return r;
    });
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${BAR_H + 8}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
        {rects.map((s) => (
          <g key={s.value}>
            <title>{`${label(s.value)}: ${Math.round(s.pct)}% (n = ${s.count}) · ${n}`}</title>
            <rect className="sh-anim" x={s.x} y={4} width={s.w} height={BAR_H} rx={4} fill={VOLUME_COLORS[s.value] ?? 'var(--sh-muted)'} stroke="rgba(20,24,29,0.15)" strokeWidth={0.75} />
            {s.w > 34 && (
              <text x={s.x + s.w / 2} y={4 + BAR_H / 2 + 4} fontSize={11.5} textAnchor="middle" fill={s.value === 'flat_flat_rose' || s.value === 'flat_fell' || s.value === 'fell_flat_rose' ? 'var(--sh-ink)' : '#FFFFFF'} className="sh-num">
                {Math.round(s.pct)}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <ul className="mt-2 flex flex-col gap-1">
        {segments.map((s) => (
          <li key={s.value} className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-sh-rule" style={{ backgroundColor: VOLUME_COLORS[s.value] }} />
            {label(s.value)}
            <span className="sh-num text-sh-muted">({s.count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
