/**
 * §6.7 — Expectation Asymmetry (signature module, custom SVG).
 *
 * Two ranked lists face each other across a central axis: what employees
 * say keeps them in the sector (amber, loyalty_factor) and what employers
 * actually use to retain staff (teal, retention_methods). Ribbons connect
 * corresponding themes; thickness reflects rank; where employee priority
 * and employer practice diverge — including a priority no retention method
 * answers at all — the ribbon is drawn in the alert colour and labelled.
 *
 * A second pairing sets employees' development appetite against employers'
 * training hours and academia collaboration. Below 768 px the ribbons give
 * way to paired stacked bars (§6.7 fallback).
 *
 * Note on the job-security theme: seven respondents share a structured
 * wording outside the §4 dictionary; it is counted as its own theme here
 * (see lib/module-data.ts and REPORT.md #3) — exactly the ranking §6.7
 * describes: pay first, then job security, then development.
 */

import { useMemo, useState } from 'react';

import { ChartCard, type TableSpec } from '../components/ChartCard';
import { ModuleSection } from '../components/ModuleSection';
import { makeBase } from '../lib/base-count';
import { cn } from '../lib/cn';
import type { Language } from '../lib/data';
import { useContainerWidth } from '../lib/hooks';
import {
  ASYMMETRY_LINKS,
  buildEmployeeThemes,
  buildRetentionThemes,
  isDivergent,
  type RankedTheme,
} from '../lib/module-data';
import { summariseLikert, tallyCategory } from '../lib/stats';
import { useFilters } from '../state/filter-context';
import { optionsOf } from '../lib/data';

type Pairing = 'retention' | 'development';

const COPY: Record<Language, {
  title: string;
  intro: string;
  pairingRetention: string;
  pairingDevelopment: string;
  leftHeading: string;
  rightHeading: string;
  resignation: (pct: number, n: number) => string;
  unmatched: string;
  divergent: string;
  devLeftHeading: string;
  devRightHeading: string;
  devLeftStat: (pct: number, n: number) => string;
  devAcademia: (pct: number) => string;
  devGapLabel: string;
  basesLine: (ne: number, nr: number) => string;
  scaleNote: string;
  themeLabels: Record<string, string>;
  methodLabels: Record<string, string>;
  trainingLabels: Record<string, string>;
  jobSecurityNote: string;
}> = {
  en: {
    title: 'Expectation Asymmetry',
    intro:
      'What employees say would keep them — against what employers actually use to keep them. Ribbons join matching themes; red marks where priority and practice diverge.',
    pairingRetention: 'Retention: priorities vs practice',
    pairingDevelopment: 'Development: appetite vs provision',
    leftHeading: 'What employees say keeps them',
    rightHeading: 'What employers use to retain',
    resignation: (pct, n) =>
      `Dominant reason resigning staff actually give: higher pay and benefit offers from other firms — ${pct}% (n = ${n}).`,
    unmatched: 'No matching employer practice',
    divergent: 'Priority and practice diverge',
    devLeftHeading: 'Employee development appetite',
    devRightHeading: 'Employer training provision',
    devLeftStat: (pct, n) => `${pct}% plan training or certification within 2 years (n = ${n})`,
    devAcademia: (pct) => `${pct}% of firms report no collaboration with education institutions.`,
    devGapLabel: 'Appetite outruns provision',
    basesLine: (ne, nr) => `Employees n = ${ne} · Employers n = ${nr}`,
    scaleNote:
      'Each side is scaled to its own base (44 employees, 20 employers); compare the percentages, not the bar lengths across sides.',
    themeLabels: {
      pay_lagging: 'Pay & benefits',
      job_security: 'Job security',
      limited_development: 'Development opportunities',
      fringe_benefits: 'Fringe benefits',
      tech_change_concern: 'Keeping pace with technology',
      subcontracting_uncertainty: 'Subcontracting uncertainty',
      no_policy_confidence: 'Policy confidence',
      other: 'Other / unclassified',
    },
    methodLabels: {
      salary_bonus: 'Salary & bonus systems',
      career_development: 'Career development',
      flexible_working: 'Flexible working',
      insurance_support: 'Insurance, meals & transport',
      company_culture: 'Company culture',
    },
    trainingLabels: {
      '0_16': '0–16 h / year',
      '17_40': '17–40 h / year',
      '41_80': '41–80 h / year',
      '81_plus': '81+ h / year',
      none: 'No in-house programme',
    },
    jobSecurityNote:
      'The job-security theme aggregates seven identically worded responses recorded outside the questionnaire’s defined options (see methodology).',
  },
  tr: {
    title: 'Beklenti Asimetrisi',
    intro:
      'Çalışanları sektörde tutacağını söyledikleri ile işverenlerin onları tutmak için fiilen kullandıkları. Şeritler eşleşen temaları birleştirir; kırmızı, öncelik ile uygulamanın ayrıştığı yerdir.',
    pairingRetention: 'Bağlılık: öncelikler ve uygulama',
    pairingDevelopment: 'Gelişim: istek ve sunum',
    leftHeading: 'Çalışanları tutan etkenler',
    rightHeading: 'İşverenlerin bağlılık yöntemleri',
    resignation: (pct, n) =>
      `İstifa edenlerin fiilen sunduğu baskın gerekçe: başka firmalardan gelen daha yüksek ücret ve yan hak teklifleri — %${pct} (n = ${n}).`,
    unmatched: 'Eşleşen işveren uygulaması yok',
    divergent: 'Öncelik ile uygulama ayrışıyor',
    devLeftHeading: 'Çalışanın gelişim isteği',
    devRightHeading: 'İşverenin eğitim sunumu',
    devLeftStat: (pct, n) => `%${pct} önümüzdeki 2 yılda eğitim/sertifika planlıyor (n = ${n})`,
    devAcademia: (pct) => `Firmaların %${pct}'i eğitim kurumlarıyla hiçbir iş birliği yapmıyor.`,
    devGapLabel: 'İstek sunumu aşıyor',
    basesLine: (ne, nr) => `Çalışanlar n = ${ne} · İşverenler n = ${nr}`,
    scaleNote:
      'Her taraf kendi tabanına göre ölçeklenir (44 çalışan, 20 işveren); taraflar arasında çubuk uzunluklarını değil yüzdeleri karşılaştırın.',
    themeLabels: {
      pay_lagging: 'Ücret ve yan haklar',
      job_security: 'İş güvencesi',
      limited_development: 'Gelişim olanakları',
      fringe_benefits: 'Yan haklar çeşitliliği',
      tech_change_concern: 'Teknolojiye ayak uydurma',
      subcontracting_uncertainty: 'Taşeron belirsizliği',
      no_policy_confidence: 'Politika güveni',
      other: 'Diğer / sınıflandırılmamış',
    },
    methodLabels: {
      salary_bonus: 'Maaş ve prim sistemleri',
      career_development: 'Kariyer gelişimi',
      flexible_working: 'Esnek çalışma',
      insurance_support: 'Sigorta, yemek ve ulaşım',
      company_culture: 'Şirket kültürü',
    },
    trainingLabels: {
      '0_16': '0–16 sa / yıl',
      '17_40': '17–40 sa / yıl',
      '41_80': '41–80 sa / yıl',
      '81_plus': '81+ sa / yıl',
      none: 'Kurum içi program yok',
    },
    jobSecurityNote:
      'İş güvencesi teması, anketin tanımlı seçenekleri dışında aynı ifadeyle kaydedilmiş yedi yanıtı bir araya getirir (bkz. yöntem).',
  },
};

export function ExpectationAsymmetry() {
  const { state, filteredEmployees, filteredEmployers, employeeBase, employerBase } = useFilters();
  const c = COPY[state.language];
  const [pairing, setPairing] = useState<Pairing>('retention');
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const narrow = width > 0 && width < 768;

  const left = useMemo(() => buildEmployeeThemes(filteredEmployees), [filteredEmployees]);
  const right = useMemo(() => buildRetentionThemes(filteredEmployers), [filteredEmployers]);

  const resignation = tallyCategory(
    filteredEmployers,
    (r) => r.resignation_reason,
    optionsOf('resignation_reason').map((o) => o.value),
  );
  const higherPay = resignation.data.find((d) => d.value === 'higher_pay');

  const dev = summariseLikert(filteredEmployees, (r) => r.development_intent);
  const devPct = dev.n > 0 ? Math.round((dev.agreeCount / dev.n) * 100) : 0;
  const training = tallyCategory(
    filteredEmployers,
    (r) => r.training_hours,
    ['0_16', '17_40', '41_80', '81_plus', 'none'],
  );
  const academiaNone = filteredEmployers.filter((r) => r.academia_collaboration === 'none').length;
  const academiaNonePct =
    filteredEmployers.length > 0 ? Math.round((academiaNone / filteredEmployers.length) * 100) : 0;

  // Whole module suppresses when either side falls below the §7 floor.
  const base = makeBase(Math.min(left.n, right.n), Math.min(employeeBase.total, employerBase.total));

  const table: TableSpec =
    pairing === 'retention'
      ? {
          headers: [c.leftHeading, '', c.rightHeading, ''],
          rows: Array.from({ length: Math.max(left.themes.length, right.themes.length) }).map(
            (_, i) => [
              left.themes[i] ? c.themeLabels[left.themes[i]!.key] ?? left.themes[i]!.key : '',
              left.themes[i] ? left.themes[i]!.count : '',
              right.themes[i] ? c.methodLabels[right.themes[i]!.key] ?? right.themes[i]!.key : '',
              right.themes[i] ? right.themes[i]!.count : '',
            ],
          ),
        }
      : {
          headers: [c.devRightHeading, ''],
          rows: [
            [c.devLeftStat(devPct, dev.n), ''],
            ...training.data.map((d) => [c.trainingLabels[d.value] ?? d.value, d.count]),
          ],
        };

  return (
    <ModuleSection id="expectation-asymmetry" title={c.title} intro={c.intro}>
      <div className="mb-4 inline-flex rounded-lg border border-sh-rule p-0.5">
        {(
          [
            ['retention', c.pairingRetention],
            ['development', c.pairingDevelopment],
          ] as [Pairing, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={pairing === v}
            onClick={() => setPairing(v)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sh-tick font-medium',
              pairing === v ? 'bg-sh-deep text-sh-surface' : 'text-sh-muted hover:text-sh-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={ref}>
        <ChartCard
          title={pairing === 'retention' ? c.pairingRetention : c.pairingDevelopment}
          base={base}
          table={table}
          ariaLabel={
            pairing === 'retention'
              ? `${c.title}: top employee priority ${c.themeLabels[left.themes[0]?.key ?? ''] ?? ''} (${left.themes[0]?.count ?? 0} of ${left.n}); top employer method ${c.methodLabels[right.themes[0]?.key ?? ''] ?? ''} (${right.themes[0]?.count ?? 0} of ${right.n}).`
              : `${c.title}: ${c.devLeftStat(devPct, dev.n)}.`
          }
          footnote={
            pairing === 'retention' ? `${c.scaleNote} ${c.jobSecurityNote}` : c.scaleNote
          }
        >
          <p className="sh-num mb-3 text-sh-tick text-sh-muted">{c.basesLine(left.n, right.n)}</p>
          {pairing === 'retention' ? (
            narrow ? (
              <StackedFallbackRetention left={left} right={right} />
            ) : (
              <RetentionRibbons left={left} right={right} />
            )
          ) : narrow ? (
            <StackedFallbackDevelopment
              devPct={devPct}
              devN={dev.n}
              training={training.data}
              trainingN={training.answered}
            />
          ) : (
            <DevelopmentRibbons
              devPct={devPct}
              devN={dev.n}
              training={training.data}
              trainingN={training.answered}
            />
          )}
          {pairing === 'retention' && higherPay && right.n > 0 ? (
            <p className="mt-4 border-l-2 border-sh-employer pl-3 text-sh-chart text-sh-muted">
              {c.resignation(Math.round(higherPay.pct), higherPay.count)}
            </p>
          ) : null}
          {pairing === 'development' ? (
            <p className="mt-4 border-l-2 border-sh-employer pl-3 text-sh-chart text-sh-muted">
              {c.devAcademia(academiaNonePct)}
            </p>
          ) : null}
        </ChartCard>
      </div>
    </ModuleSection>
  );
}

/* ------------------------------------------------------------------ */
/* Ribbon layout shared geometry                                       */
/* ------------------------------------------------------------------ */

const W = 980;
const SIDE_W = 372;
const RIGHT_X = W - SIDE_W; // 608
// Bars are capped so the longest bar clears the longest theme name.
const RIGHT_BAR_W_MAX = 185;
const LEFT_BAR_W_MAX = 185;
const ROW_H = 26;
const ROW_GAP = 20;
const TOP = 10;

function rowY(i: number) {
  return TOP + i * (ROW_H + ROW_GAP);
}

function ribbonPath(y1: number, y2: number, thickness: number): string {
  const x1 = SIDE_W + 6;
  const x2 = RIGHT_X - 6;
  const mid = (x1 + x2) / 2;
  const t = thickness / 2;
  return [
    `M ${x1} ${y1 - t}`,
    `C ${mid} ${y1 - t}, ${mid} ${y2 - t}, ${x2} ${y2 - t}`,
    `L ${x2} ${y2 + t}`,
    `C ${mid} ${y2 + t}, ${mid} ${y1 + t}, ${x1} ${y1 + t}`,
    'Z',
  ].join(' ');
}

function RetentionRibbons({
  left,
  right,
}: {
  left: { themes: RankedTheme[]; n: number };
  right: { themes: RankedTheme[]; n: number };
}) {
  const { state } = useFilters();
  const c = COPY[state.language];

  const leftThemes = left.themes.filter((t) => t.count > 0);
  const rightThemes = right.themes.filter((t) => t.count > 0);
  const maxLeft = Math.max(1, ...leftThemes.map((t) => t.count));
  const maxRight = Math.max(1, ...rightThemes.map((t) => t.count));
  const rows = Math.max(leftThemes.length, rightThemes.length);
  const H = rowY(rows - 1) + ROW_H + 26;

  const leftIndex = new Map(leftThemes.map((t, i) => [t.key, i]));
  const rightIndex = new Map(rightThemes.map((t, i) => [t.key, i]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Column headings */}
      <text x={0} y={TOP - 0} fontSize={12.5} fontWeight={700} fill="var(--sh-deep)" dy={-2}>
        {c.leftHeading}
      </text>
      <text x={W} y={TOP - 0} fontSize={12.5} fontWeight={700} fill="var(--sh-deep)" textAnchor="end" dy={-2}>
        {c.rightHeading}
      </text>

      {/* Ribbons under the bars */}
      {ASYMMETRY_LINKS.map((link) => {
        const li = leftIndex.get(link.left);
        if (li === undefined) return null;
        const l = leftThemes[li]!;
        const y1 = rowY(li) + 14 + ROW_H / 2;
        const divergent = isDivergent(link, leftThemes, rightThemes);

        if (link.right === null) {
          // Unmatched priority: a stub fading into the gap, alert-coloured,
          // labelled centred in the gap below the row so it never touches
          // the right-hand bars.
          return (
            <g key={link.left}>
              <path
                d={`M ${SIDE_W + 6} ${y1 - 8} C ${SIDE_W + 90} ${y1 - 8}, ${SIDE_W + 90} ${y1 - 2}, ${SIDE_W + 118} ${y1 - 1} L ${SIDE_W + 118} ${y1 + 1} C ${SIDE_W + 90} ${y1 + 2}, ${SIDE_W + 90} ${y1 + 8}, ${SIDE_W + 6} ${y1 + 8} Z`}
                fill="var(--sh-alert)"
                opacity={0.45}
              />
              <text x={(SIDE_W + RIGHT_X) / 2} y={y1 + 24} fontSize={11} textAnchor="middle" fill="var(--sh-alert)" fontWeight={600}>
                ⚠ {c.unmatched}
              </text>
            </g>
          );
        }

        const ri = rightIndex.get(link.right);
        if (ri === undefined) return null;
        const r = rightThemes[ri]!;
        const y2 = rowY(ri) + 14 + ROW_H / 2;
        const avgRank = (l.rank + r.rank) / 2;
        const thickness = Math.max(7, 24 - 4 * (avgRank - 1));
        return (
          <g key={link.left}>
            <title>{`${c.themeLabels[link.left]} ↔ ${c.methodLabels[link.right]}${divergent ? ` — ${c.divergent}` : ''}`}</title>
            <path
              d={ribbonPath(y1, y2, thickness)}
              fill={divergent ? 'var(--sh-alert)' : 'var(--sh-muted)'}
              opacity={divergent ? 0.5 : 0.28}
            />
            {divergent && (
              <text
                x={(SIDE_W + RIGHT_X) / 2}
                y={(y1 + y2) / 2 - thickness / 2 - 5}
                fontSize={11}
                textAnchor="middle"
                fill="var(--sh-alert)"
                fontWeight={600}
              >
                {c.divergent}
              </text>
            )}
          </g>
        );
      })}

      {/* Left ranked list (amber) — bars grow toward the axis. Counts sit
          inside the bar when they fit, so they never touch the theme name. */}
      {leftThemes.map((theme, i) => {
        const y = rowY(i) + 14;
        const w = (theme.count / maxLeft) * LEFT_BAR_W_MAX;
        const pct = left.n > 0 ? Math.round((theme.count / left.n) * 100) : 0;
        const countLabel = `${theme.count} · ${pct}%`;
        const inside = w > 64;
        return (
          <g key={theme.key}>
            <title>{`${c.themeLabels[theme.key] ?? theme.key}: ${pct}% (n = ${theme.count})`}</title>
            <text x={0} y={y + ROW_H / 2 + 4} fontSize={12} fill="var(--sh-deep)">
              {c.themeLabels[theme.key] ?? theme.key}
            </text>
            <rect
              className="sh-anim"
              x={SIDE_W - w}
              y={y}
              width={Math.max(w, 3)}
              height={ROW_H}
              rx={4}
              fill={theme.key === 'other' ? 'var(--sh-muted)' : 'var(--sh-employee)'}
              stroke="rgba(20,24,29,0.15)"
              strokeWidth={0.75}
            />
            <text
              x={inside ? SIDE_W - w + 6 : SIDE_W - w - 6}
              y={y + ROW_H / 2 + 4}
              fontSize={11.5}
              textAnchor={inside ? 'start' : 'end'}
              fill={inside ? (theme.key === 'other' ? '#FFFFFF' : 'var(--sh-ink)') : 'var(--sh-ink)'}
              className="sh-num"
            >
              {countLabel}
            </text>
          </g>
        );
      })}

      {/* Right ranked list (teal); counts inside long bars for the same reason. */}
      {rightThemes.map((theme, i) => {
        const y = rowY(i) + 14;
        const w = (theme.count / maxRight) * RIGHT_BAR_W_MAX;
        const pct = right.n > 0 ? Math.round((theme.count / right.n) * 100) : 0;
        const countLabel = `${theme.count} · ${pct}%`;
        const inside = w > 64;
        return (
          <g key={theme.key}>
            <title>{`${c.methodLabels[theme.key] ?? theme.key}: ${pct}% (n = ${theme.count})`}</title>
            <text x={W} y={y + ROW_H / 2 + 4} fontSize={12} textAnchor="end" fill="var(--sh-deep)">
              {c.methodLabels[theme.key] ?? theme.key}
            </text>
            <rect
              className="sh-anim"
              x={RIGHT_X}
              y={y}
              width={Math.max(w, 3)}
              height={ROW_H}
              rx={4}
              fill="var(--sh-employer)"
              stroke="rgba(20,24,29,0.15)"
              strokeWidth={0.75}
            />
            <text
              x={inside ? RIGHT_X + w - 6 : RIGHT_X + Math.max(w, 3) + 6}
              y={y + ROW_H / 2 + 4}
              fontSize={11.5}
              textAnchor={inside ? 'end' : 'start'}
              fill={inside ? '#FFFFFF' : 'var(--sh-ink)'}
              className="sh-num"
            >
              {countLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DevelopmentRibbons({
  devPct,
  devN,
  training,
  trainingN,
}: {
  devPct: number;
  devN: number;
  training: { value: string; count: number; pct: number }[];
  trainingN: number;
}) {
  const { state } = useFilters();
  const c = COPY[state.language];
  const rows = training.length;
  const H = rowY(rows - 1) + ROW_H + 26;
  const maxCount = Math.max(1, ...training.map((t) => t.count));

  // The gap ribbon lands on the low-provision rows (0–16 h and none).
  const lowIdx = training.findIndex((d) => d.value === '0_16');
  const yLeft = rowY(Math.floor((rows - 1) / 2)) + 14 + ROW_H / 2;
  const yRight = rowY(lowIdx >= 0 ? lowIdx : 0) + 14 + ROW_H / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="presentation" aria-hidden="true" style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>
      <text x={0} y={TOP - 2} fontSize={12.5} fontWeight={700} fill="var(--sh-deep)">
        {c.devLeftHeading}
      </text>
      <text x={W} y={TOP - 2} fontSize={12.5} fontWeight={700} fill="var(--sh-deep)" textAnchor="end">
        {c.devRightHeading}
      </text>

      <path d={ribbonPath(yLeft, yRight, 16)} fill="var(--sh-alert)" opacity={0.45} />
      <text x={(SIDE_W + RIGHT_X) / 2} y={Math.min(yLeft, yRight) - 14} fontSize={11.5} textAnchor="middle" fill="var(--sh-alert)" fontWeight={600}>
        {c.devGapLabel}
      </text>

      {/* Left: the single appetite bar with the % set large. */}
      <g>
        <title>{c.devLeftStat(devPct, devN)}</title>
        <rect
          className="sh-anim"
          x={SIDE_W - (devPct / 100) * LEFT_BAR_W_MAX}
          y={yLeft - ROW_H / 2}
          width={Math.max((devPct / 100) * LEFT_BAR_W_MAX, 3)}
          height={ROW_H}
          rx={4}
          fill="var(--sh-employee)"
          stroke="rgba(20,24,29,0.15)"
        />
        <text x={0} y={yLeft - ROW_H / 2 - 10} fontSize={12} fill="var(--sh-deep)">
          {c.devLeftStat(devPct, devN)}
        </text>
        <text x={SIDE_W - (devPct / 100) * LEFT_BAR_W_MAX - 8} y={yLeft + 7} fontSize={22} fontWeight={700} textAnchor="end" fill="var(--sh-deep)" className="sh-num">
          {devPct}%
        </text>
      </g>

      {/* Right: annual in-house training hours per employee. */}
      {training.map((d, i) => {
        const y = rowY(i) + 14;
        const w = (d.count / maxCount) * RIGHT_BAR_W_MAX;
        const pct = trainingN > 0 ? Math.round((d.count / trainingN) * 100) : 0;
        return (
          <g key={d.value}>
            <title>{`${c.trainingLabels[d.value]}: ${pct}% (n = ${d.count})`}</title>
            <text x={W} y={y + ROW_H / 2 + 4} fontSize={12} textAnchor="end" fill="var(--sh-deep)">
              {c.trainingLabels[d.value]}
            </text>
            <rect
              className="sh-anim"
              x={RIGHT_X}
              y={y}
              width={Math.max(w, d.count > 0 ? 3 : 0)}
              height={ROW_H}
              rx={4}
              fill="var(--sh-employer)"
              stroke="rgba(20,24,29,0.15)"
              strokeWidth={0.75}
            />
            <text x={RIGHT_X + Math.max(w, 3) + 6} y={y + ROW_H / 2 + 4} fontSize={11.5} fill="var(--sh-ink)" className="sh-num">
              {`${d.count} · ${pct}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* <768px fallback: paired stacked bars, no ribbons (§6.7)             */
/* ------------------------------------------------------------------ */

function MiniBarList({
  heading,
  series,
  items,
  n,
}: {
  heading: string;
  series: 'employee' | 'employer';
  items: { key: string; label: string; count: number; alert?: boolean }[];
  n: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <h5 className="flex items-center gap-2 text-sh-h4 text-sh-deep">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--sh-${series})` }} />
        {heading}
      </h5>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => {
          const pct = n > 0 ? Math.round((item.count / n) * 100) : 0;
          return (
            <li key={item.key} className="text-sh-tick">
              <div className="flex justify-between gap-2">
                <span className={cn('text-sh-ink', item.alert && 'font-semibold text-sh-alert')}>
                  {item.label}
                </span>
                <span className="sh-num text-sh-muted">{`${item.count} · ${pct}%`}</span>
              </div>
              <div className="mt-0.5 h-2.5 rounded-full bg-sh-sand">
                <div
                  className="sh-anim h-2.5 rounded-full"
                  style={{
                    width: `${(item.count / max) * 100}%`,
                    backgroundColor: item.alert ? 'var(--sh-alert)' : `var(--sh-${series})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StackedFallbackRetention({
  left,
  right,
}: {
  left: { themes: RankedTheme[]; n: number };
  right: { themes: RankedTheme[]; n: number };
}) {
  const { state } = useFilters();
  const c = COPY[state.language];
  return (
    <div className="flex flex-col gap-5">
      <MiniBarList
        heading={c.leftHeading}
        series="employee"
        n={left.n}
        items={left.themes
          .filter((t) => t.count > 0)
          .map((t) => ({
            key: t.key,
            label: c.themeLabels[t.key] ?? t.key,
            count: t.count,
            alert: t.key === 'job_security',
          }))}
      />
      <MiniBarList
        heading={c.rightHeading}
        series="employer"
        n={right.n}
        items={right.themes
          .filter((t) => t.count > 0)
          .map((t) => ({ key: t.key, label: c.methodLabels[t.key] ?? t.key, count: t.count }))}
      />
      <p className="text-sh-tick font-medium text-sh-alert">⚠ {c.unmatched}: {c.themeLabels['job_security']}</p>
    </div>
  );
}

function StackedFallbackDevelopment({
  devPct,
  devN,
  training,
  trainingN,
}: {
  devPct: number;
  devN: number;
  training: { value: string; count: number; pct: number }[];
  trainingN: number;
}) {
  const { state } = useFilters();
  const c = COPY[state.language];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sh-body font-semibold text-sh-deep">
        <span className="sh-num text-[32px] font-bold">{devPct}%</span>{' '}
        <span className="text-sh-chart font-normal text-sh-muted">{c.devLeftStat(devPct, devN)}</span>
      </p>
      <MiniBarList
        heading={c.devRightHeading}
        series="employer"
        n={trainingN}
        items={training.map((d) => ({
          key: d.value,
          label: c.trainingLabels[d.value] ?? d.value,
          count: d.count,
          alert: d.value === '0_16' || d.value === 'none',
        }))}
      />
    </div>
  );
}
