/**
 * §6.6 — The Education–Certification Gap. Left: a 3 × 2 matrix of
 * education-role alignment × certificate holding, cell size encoding count
 * (custom SVG). Right: certificate types held, with "No certificate"
 * highlighted in the alert colour. The report's "47%" headline is shown as
 * the honest three-band split with a footnote on how it was constructed —
 * never as a binary. The paired employer statistic (graduate readiness)
 * sits directly beneath.
 */

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { optionsOf, type Language } from '../lib/data';
import { buildGapMatrix, MATCH_BANDS } from '../lib/module-data';
import { summariseLikert } from '../lib/stats';
import { useFilters } from '../state/filter-context';

const COPY: Record<Language, {
  title: string;
  intro: string;
  matrixTitle: string;
  certTitle: string;
  aligned: string;
  neutral: string;
  misaligned: string;
  withCert: string;
  withoutCert: string;
  fortySevenNote: (neutral: number, mis: number) => string;
  certFootnote: string;
  employerStat: (pct: number, n: number) => string;
  employerStatLabel: string;
}> = {
  en: {
    title: 'The Education–Certification Gap',
    intro:
      'Does education match the role, and does certification fill the gap? The matrix shows whether the people whose education does not match their role are the same people lacking certification.',
    matrixTitle: 'Education–role alignment × certificate holding',
    certTitle: 'Professional certificates held',
    aligned: 'Aligned (4–5)',
    neutral: 'Neutral (3)',
    misaligned: 'Misaligned (1–2)',
    withCert: 'Holds a certificate',
    withoutCert: 'No certificate',
    fortySevenNote: (neutral, mis) =>
      `The report's headline "47% work in unrelated roles" combines the ${neutral}% neutral band with the ${mis}% who disagree. The explorer keeps the three bands separate; the 47% is their sum, not a binary finding.`,
    certFootnote:
      'Share of all filtered respondents. Two respondents listed only unrecognised entries (quarantined in the free-text drawer) and appear in no bar.',
    employerStat: (pct, n) =>
      `${pct}% of employers (n = ${n}) say new graduates' job readiness does not meet expectations — the same gap, seen from the other side of the table.`,
    employerStatLabel: 'Paired employer statistic',
  },
  tr: {
    title: 'Eğitim–Belgelendirme Açığı',
    intro:
      'Eğitim rolle örtüşüyor mu, belgelendirme açığı kapatıyor mu? Matris, eğitimi rolüyle örtüşmeyenlerin belgesiz kalanlarla aynı kişiler olup olmadığını gösterir.',
    matrixTitle: 'Eğitim–rol uyumu × sertifika sahipliği',
    certTitle: 'Sahip olunan mesleki sertifikalar',
    aligned: 'Uyumlu (4–5)',
    neutral: 'Kararsız (3)',
    misaligned: 'Uyumsuz (1–2)',
    withCert: 'Sertifikası var',
    withoutCert: 'Sertifikası yok',
    fortySevenNote: (neutral, mis) =>
      `Raporun "%47 ilgisiz rollerde çalışıyor" başlığı, %${neutral} kararsız bandı ile %${mis} katılmayanları birleştirir. Gezgin üç bandı ayrı tutar; %47 bunların toplamıdır, ikili bir bulgu değildir.`,
    certFootnote:
      'Filtrelenmiş tüm katılımcıların payı. Yalnızca tanınmayan girişler yazan iki katılımcı (serbest metin çekmecesinde) hiçbir çubukta görünmez.',
    employerStat: (pct, n) =>
      `İşverenlerin %${pct}'i (n = ${n}) yeni mezunların göreve hazırlığının beklentileri karşılamadığını söylüyor — aynı açık, masanın öbür tarafından.`,
    employerStatLabel: 'Eşleşen işveren istatistiği',
  },
};

export function EducationGap() {
  const { state, filteredEmployees, filteredEmployers, employeeBase, employerBase } = useFilters();
  const t = useStrings(state.language);
  const c = COPY[state.language];

  const dimmed = state.lens !== 'employees';
  const dimNote = state.lens === 'employers' ? t.dimmedEmployerLens : t.dimmedCompareLens;

  const matrix = buildGapMatrix(filteredEmployees);
  const matrixBase = makeBase(matrix.n, employeeBase.total);

  const neutralPct = matrix.n > 0 ? Math.round(((matrix.counts.neutral[0] + matrix.counts.neutral[1]) / matrix.n) * 100) : 0;
  const misPct = matrix.n > 0 ? Math.round(((matrix.counts.misaligned[0] + matrix.counts.misaligned[1]) / matrix.n) * 100) : 0;

  const bandLabels: Record<(typeof MATCH_BANDS)[number], string> = {
    aligned: c.aligned,
    neutral: c.neutral,
    misaligned: c.misaligned,
  };

  const matrixTable: TableSpec = {
    headers: ['', c.withCert, c.withoutCert],
    rows: MATCH_BANDS.map((band) => [bandLabels[band], matrix.counts[band][0], matrix.counts[band][1]]),
  };

  // Certificate bar: denominator is ALL filtered respondents, matching the
  // report's 32% "No certificate" (14 of 44).
  const nRecords = filteredEmployees.length;
  const certOptions = optionsOf('certificates');
  const certData = certOptions
    .map((o) => {
      const count = filteredEmployees.filter((r) => r.certificates.includes(o.value)).length;
      return {
        value: o.value,
        label: state.language === 'tr' ? o.labelTr : o.labelEn,
        count,
        pct: nRecords > 0 ? (count / nRecords) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const certTable: TableSpec = {
    headers: [t.category, t.count, t.share],
    rows: certData.map((d) => [d.label, d.count, `${Math.round(d.pct)}%`]),
  };

  const grad = summariseLikert(filteredEmployers, (r) => r.graduate_readiness);
  const gradDisagreePct = grad.n > 0 ? Math.round(((grad.counts[0] + grad.counts[1]) / grad.n) * 100) : 0;

  return (
    <ModuleSection id="education-gap" title={c.title} intro={c.intro}>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title={c.matrixTitle}
            base={matrixBase}
            series="employee"
            table={matrixTable}
            ariaLabel={`${c.matrixTitle} (n = ${matrix.n}).`}
            footnote={c.fortySevenNote(neutralPct, misPct)}
          >
            <GapMatrixSvg
              counts={matrix.counts}
              bandLabels={bandLabels}
              certLabels={[c.withCert, c.withoutCert]}
            />
          </ChartCard>

          <ChartCard
            title={c.certTitle}
            base={makeBase(nRecords, employeeBase.total)}
            series="employee"
            table={certTable}
            ariaLabel={`${c.certTitle}: largest ${certData[0]?.label ?? ''} (n = ${certData[0]?.count ?? 0}).`}
            footnote={c.certFootnote}
          >
            <CertBars data={certData} />
          </ChartCard>
        </div>

        {/* Paired employer statistic (§6.6), suppressed with the employer base. */}
        {employerBase.status !== 'suppressed' && (
          <aside className="mt-6 flex items-start gap-3 rounded-sh-card border border-sh-employer bg-[#E4F0EE] p-5">
            <span aria-hidden="true" className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full bg-sh-employer" />
            <div>
              <h4 className="text-sh-h4 text-sh-deep">{c.employerStatLabel}</h4>
              <p className="mt-1 text-sh-chart leading-relaxed text-sh-ink">
                {c.employerStat(gradDisagreePct, grad.n)}
              </p>
            </div>
          </aside>
        )}
      </DimmablePanel>
    </ModuleSection>
  );
}

/** 3 × 2 matrix; square area encodes count, every cell labelled. */
function GapMatrixSvg({
  counts,
  bandLabels,
  certLabels,
}: {
  counts: Record<(typeof MATCH_BANDS)[number], [number, number]>;
  bandLabels: Record<(typeof MATCH_BANDS)[number], string>;
  certLabels: [string, string];
}) {
  const W = 560;
  const LABEL_W = 150;
  const CELL = 120;
  const HEADER_H = 30;
  const H = HEADER_H + 2 * CELL + 12;
  const maxCount = Math.max(1, ...MATCH_BANDS.flatMap((b) => counts[b]));
  const MAX_SIDE = CELL - 26;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
      {MATCH_BANDS.map((band, col) => (
        <text
          key={band}
          x={LABEL_W + col * CELL + CELL / 2}
          y={HEADER_H - 12}
          fontSize={12}
          textAnchor="middle"
          fill="var(--sh-muted)"
        >
          {bandLabels[band]}
        </text>
      ))}
      {certLabels.map((label, row) => (
        <text
          key={label}
          x={LABEL_W - 12}
          y={HEADER_H + row * CELL + CELL / 2 + 4}
          fontSize={12}
          textAnchor="end"
          fill="var(--sh-deep)"
        >
          {label}
        </text>
      ))}
      {MATCH_BANDS.map((band, col) =>
        [0, 1].map((row) => {
          const count = counts[band][row as 0 | 1];
          // Area ∝ count (§6.6): side scales with the square root.
          const side = count === 0 ? 0 : Math.max(16, Math.sqrt(count / maxCount) * MAX_SIDE);
          const cx = LABEL_W + col * CELL + CELL / 2;
          const cy = HEADER_H + row * CELL + CELL / 2;
          return (
            <g key={`${band}-${row}`}>
              <title>{`${bandLabels[band]} · ${certLabels[row as 0 | 1]}: ${count}`}</title>
              <rect
                x={LABEL_W + col * CELL + 4}
                y={HEADER_H + row * CELL + 4}
                width={CELL - 8}
                height={CELL - 8}
                rx={6}
                fill="var(--sh-sand)"
                stroke="var(--sh-rule)"
              />
              {count > 0 && (
                <rect
                  className="sh-anim"
                  x={cx - side / 2}
                  y={cy - side / 2}
                  width={side}
                  height={side}
                  rx={5}
                  fill={row === 1 ? 'var(--sh-alert)' : 'var(--sh-employee)'}
                  fillOpacity={0.88}
                  stroke="rgba(20,24,29,0.2)"
                />
              )}
              <text
                x={cx}
                y={cy + 4.5}
                fontSize={13}
                fontWeight={700}
                textAnchor="middle"
                fill={count > 0 && side > 24 ? '#FFFFFF' : 'var(--sh-ink)'}
                className="sh-num"
              >
                {count}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** Horizontal certificate bars with "No certificate" in the alert colour. */
function CertBars({
  data,
}: {
  data: { value: string; label: string; count: number; pct: number }[];
}) {
  const W = 560;
  const LABEL_W = 250;
  const ROW_H = 22;
  const ROW_GAP = 10;
  const TRACK_W = W - LABEL_W - 70;
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const H = data.length * (ROW_H + ROW_GAP);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto' }}>
      {data.map((d, i) => {
        const y = i * (ROW_H + ROW_GAP);
        const w = (d.count / maxCount) * TRACK_W;
        const isNone = d.value === 'none';
        return (
          <g key={d.value}>
            <title>{`${d.label}: ${Math.round(d.pct)}% (n = ${d.count})`}</title>
            <text x={LABEL_W - 10} y={y + ROW_H / 2 + 4} fontSize={11.5} textAnchor="end" fill={isNone ? 'var(--sh-alert)' : 'var(--sh-deep)'} fontWeight={isNone ? 700 : 400}>
              {d.label.length > 36 ? `${d.label.slice(0, 35)}…` : d.label}
            </text>
            <rect
              className="sh-anim"
              x={LABEL_W}
              y={y}
              width={Math.max(w, d.count > 0 ? 3 : 0)}
              height={ROW_H}
              rx={4}
              fill={isNone ? 'var(--sh-alert)' : 'var(--sh-employee)'}
              stroke="rgba(20,24,29,0.15)"
              strokeWidth={0.75}
            />
            <text x={LABEL_W + Math.max(w, 3) + 8} y={y + ROW_H / 2 + 4} fontSize={11.5} fill="var(--sh-ink)" className="sh-num">
              {`${d.count} · ${Math.round(d.pct)}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
