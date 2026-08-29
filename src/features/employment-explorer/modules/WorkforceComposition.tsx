/**
 * §6.8 — Employer workforce composition. A heatmap matrix of staff
 * functions and education levels against the percentage bands, revealing
 * that administration runs lean while installation and O&M carry the mass,
 * and that postgraduate staff are effectively absent. The zero-variance
 * doctorate row renders as a highlighted statement, not a chart row.
 * Second panel: female share in technical vs management roles — with the
 * GÜNDER contradiction surfaced side by side, sources labelled, and no
 * attempt to pick a winner.
 */

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { Heatmap } from '../components/Heatmap';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import type { Language } from '../lib/data';
import {
  buildBandMatrix,
  EDU_DIST_ROWS,
  PCT_BAND_VALUES,
  STAFF_DIST_ROWS,
} from '../lib/module-data';
import { useFilters } from '../state/filter-context';

const COPY: Record<Language, {
  title: string;
  intro: string;
  heatmapTitle: string;
  genderTitle: string;
  doctorateStatement: (n: number) => string;
  bandLabels: string[];
  staffRows: string[];
  eduRows: string[];
  technical: string;
  management: string;
  firms: string;
  contradictionTitle: string;
  contradictionGunder: string;
  contradictionSurvey: (tech: string, mgmt: string) => string;
  contradictionVerdict: string;
  sourceGunder: string;
  sourceSurvey: string;
}> = {
  en: {
    title: 'Employer workforce composition',
    intro:
      'How the 20 firms distribute their people across functions and education levels — each cell counts the firms reporting that share band.',
    heatmapTitle: 'Staff functions and education levels by share band',
    genderTitle: 'Female employee share: technical vs management',
    doctorateStatement: (n) =>
      `All ${n} firms report 0–20% doctorate-level staff — zero variance. PhD-level talent is effectively absent sector-wide, so the row is a statement, not a chart.`,
    bandLabels: ['0–20%', '21–40%', '41–60%', 'Over 61%'],
    staffRows: [
      'Project development & design',
      'Installation & O&M',
      'Production lines',
      'Administrative services',
      'Sales services',
    ],
    eduRows: ['Postgraduate', 'Bachelor', 'Associate / vocational', 'Secondary', 'Primary'],
    technical: 'Technical positions',
    management: 'Management & administrative',
    firms: 'firms',
    contradictionTitle: 'Two figures that do not reconcile',
    contradictionGunder: 'GÜNDER sector data cited in the report: roughly 40% female participation.',
    contradictionSurvey: (tech, mgmt) =>
      `This survey: technical roles mostly in the ${tech} band; management concentrated in ${mgmt}.`,
    contradictionVerdict:
      'The two figures do not reconcile. Both are shown with their sources; the explorer does not pick one.',
    sourceGunder: 'Source: GÜNDER, cited in the report’s sector overview',
    sourceSurvey: 'Source: this employer survey (n = 20)',
  },
  tr: {
    title: 'İşveren iş gücü bileşimi',
    intro:
      '20 firmanın çalışanlarını işlevlere ve eğitim seviyelerine nasıl dağıttığı — her hücre, o oran bandını bildiren firma sayısıdır.',
    heatmapTitle: 'Oran bandına göre personel işlevleri ve eğitim seviyeleri',
    genderTitle: 'Kadın çalışan oranı: teknik ve yönetim',
    doctorateStatement: (n) =>
      `${n} firmanın tamamı %0–20 doktoralı personel bildiriyor — sıfır varyans. Doktora düzeyi yetenek sektör genelinde fiilen yok; bu satır grafik değil, bir tespittir.`,
    bandLabels: ['%0–20', '%21–40', '%41–60', '%61 üzeri'],
    staffRows: [
      'Proje geliştirme ve tasarım',
      'Kurulum ve İşletme-Bakım',
      'Üretim hatları',
      'İdari hizmetler',
      'Satış hizmetleri',
    ],
    eduRows: ['Lisansüstü', 'Lisans', 'Ön lisans / MYO', 'Ortaöğretim', 'İlköğretim'],
    technical: 'Teknik pozisyonlar',
    management: 'Yönetim ve idari',
    firms: 'firma',
    contradictionTitle: 'Uzlaşmayan iki rakam',
    contradictionGunder: 'Raporda alıntılanan GÜNDER sektör verisi: yaklaşık %40 kadın katılımı.',
    contradictionSurvey: (tech, mgmt) =>
      `Bu anket: teknik roller çoğunlukla ${tech} bandında; yönetim ${mgmt} bandında yoğunlaşıyor.`,
    contradictionVerdict:
      'İki rakam uzlaşmıyor. Her ikisi de kaynaklarıyla gösteriliyor; gezgin birini seçmiyor.',
    sourceGunder: 'Kaynak: GÜNDER, raporun sektör özetinde alıntılanmıştır',
    sourceSurvey: 'Kaynak: bu işveren anketi (n = 20)',
  },
};

export function WorkforceComposition() {
  const { state, filteredEmployers, employerBase } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  const dimmed = state.lens !== 'employers';
  const dimNote = state.lens === 'employees' ? t.dimmedEmployeeLens : t.dimmedCompareLens;

  const rows = [...STAFF_DIST_ROWS, ...EDU_DIST_ROWS];
  const matrix = buildBandMatrix(filteredEmployers, rows, [...PCT_BAND_VALUES]);
  const rowLabels = [...c.staffRows, ...c.eduRows];
  const base = makeBase(filteredEmployers.length, employerBase.total);

  const heatmapTable: TableSpec = {
    headers: ['', ...c.bandLabels],
    rows: rows.map((_, r) => [rowLabels[r] ?? '', ...(matrix.counts[r] ?? [])]),
  };

  // Gender panel data
  const genderMatrix = buildBandMatrix(
    filteredEmployers,
    ['female_technical', 'female_management'],
    [...PCT_BAND_VALUES],
  );
  const genderTable: TableSpec = {
    headers: ['', ...c.bandLabels],
    rows: [
      [c.technical, ...(genderMatrix.counts[0] ?? [])],
      [c.management, ...(genderMatrix.counts[1] ?? [])],
    ],
  };

  // Modal bands for the contradiction copy, computed live.
  const modalBand = (row: number[]) => {
    const idx = row.indexOf(Math.max(...row));
    return c.bandLabels[idx] ?? '';
  };
  const techModal = modalBand(genderMatrix.counts[0] ?? [0]);
  const mgmtModal = modalBand(genderMatrix.counts[1] ?? [0]);

  const allDoctorateLow =
    filteredEmployers.length > 0 &&
    filteredEmployers.every((r) => r.edu_dist_doctorate === '0_20');

  return (
    <ModuleSection id="workforce-composition" title={c.title} intro={c.intro}>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <div className="flex flex-col gap-6">
          {/* §6.8: the zero-variance doctorate finding, above the heatmap. */}
          {allDoctorateLow && base.status !== 'suppressed' && (
            <p className="rounded-sh-card border border-sh-employer bg-[#E4F0EE] p-4 text-sh-chart leading-relaxed text-sh-ink">
              {c.doctorateStatement(filteredEmployers.length)}
            </p>
          )}

          <ChartCard
            title={c.heatmapTitle}
            base={base}
            series="employer"
            table={heatmapTable}
            ariaLabel={`${c.heatmapTitle} (n = ${base.n} ${c.firms}).`}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <Heatmap
                  matrix={matrix}
                  rowLabels={rowLabels}
                  colLabels={c.bandLabels}
                  separatorAfter={STAFF_DIST_ROWS.length - 1}
                  tooltip={(row, col, count) => `${row} · ${col}: ${count} ${c.firms}`}
                />
              </div>
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={c.genderTitle}
              base={base}
              series="employer"
              table={genderTable}
              ariaLabel={`${c.genderTitle} (n = ${base.n}).`}
            >
              <GenderBandBars
                bands={c.bandLabels}
                technical={genderMatrix.counts[0] ?? []}
                management={genderMatrix.counts[1] ?? []}
                technicalLabel={c.technical}
                managementLabel={c.management}
                n={base.n}
              />
            </ChartCard>

            {/* §6.8 contradiction — surfaced, not hidden. */}
            {base.status !== 'suppressed' && (
              <aside className="rounded-sh-card border border-sh-alert/60 bg-sh-surface p-5" style={{ borderColor: 'var(--sh-alert)' }}>
                <h4 className="text-sh-h4 text-sh-deep">{c.contradictionTitle}</h4>
                <dl className="mt-3 flex flex-col gap-3 text-sh-chart text-sh-ink">
                  <div>
                    <dd className="leading-relaxed">{c.contradictionGunder}</dd>
                    <dt className="mt-0.5 text-sh-tick text-sh-muted">{c.sourceGunder}</dt>
                  </div>
                  <div>
                    <dd className="leading-relaxed">{c.contradictionSurvey(techModal, mgmtModal)}</dd>
                    <dt className="mt-0.5 text-sh-tick text-sh-muted">{c.sourceSurvey}</dt>
                  </div>
                </dl>
                <p className="mt-3 border-t border-sh-rule pt-3 text-sh-chart font-medium text-sh-ink">
                  {c.contradictionVerdict}
                </p>
              </aside>
            )}
          </div>
        </div>
      </DimmablePanel>
    </ModuleSection>
  );
}

/** Paired horizontal band bars: technical (teal) vs management (soft teal). */
function GenderBandBars({
  bands,
  technical,
  management,
  technicalLabel,
  managementLabel,
  n,
}: {
  bands: string[];
  technical: number[];
  management: number[];
  technicalLabel: string;
  managementLabel: string;
  n: number;
}) {
  const W = 560;
  const LABEL_W = 90;
  const GROUP_H = 52;
  const BAR_H = 18;
  const TRACK_W = W - LABEL_W - 70;
  const max = Math.max(1, ...technical, ...management);
  const H = bands.length * GROUP_H + 24;

  const bar = (count: number, y: number, fill: string, label: string, band: string) => {
    const w = (count / max) * TRACK_W;
    const pct = n > 0 ? Math.round((count / n) * 100) : 0;
    return (
      <g>
        <title>{`${label} · ${band}: ${pct}% (n = ${count})`}</title>
        <rect className="sh-anim" x={LABEL_W} y={y} width={Math.max(w, count > 0 ? 3 : 0)} height={BAR_H} rx={3} fill={fill} stroke="rgba(20,24,29,0.15)" strokeWidth={0.75} />
        <text x={LABEL_W + Math.max(w, 3) + 6} y={y + BAR_H / 2 + 4} fontSize={11} fill="var(--sh-ink)" className="sh-num">
          {count}
        </text>
      </g>
    );
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
        {bands.map((band, i) => {
          const y = i * GROUP_H;
          return (
            <g key={band}>
              <text x={LABEL_W - 10} y={y + GROUP_H / 2} fontSize={12} textAnchor="end" fill="var(--sh-deep)">
                {band}
              </text>
              {bar(technical[i] ?? 0, y + 6, 'var(--sh-employer)', technicalLabel, band)}
              {bar(management[i] ?? 0, y + 6 + BAR_H + 3, 'var(--sh-employer-soft)', managementLabel, band)}
            </g>
          );
        })}
      </svg>
      <ul className="mt-1 flex gap-4">
        {[
          { label: technicalLabel, color: 'var(--sh-employer)' },
          { label: managementLabel, color: 'var(--sh-employer-soft)' },
        ].map((e) => (
          <li key={e.label} className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm border border-sh-rule" style={{ backgroundColor: e.color }} />
            {e.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
