/**
 * §6.3 — The Confidence Ladder (signature module, custom SVG).
 *
 * Three rungs — Self / Employer / Sector — each a stacked agreement bar
 * with the percentage set large at the right; connecting lines between the
 * rung ends show the drop. Toggles between % agreeing (4–5), mean score
 * (1–5) and the full 5-point distribution. Recomputes from the filtered
 * employee set; §7 suppression and the table alternative come from
 * <ChartCard>. Bar geometry transitions 200 ms ease-out on filter changes
 * (§5.3) via the .sh-anim class; motion collapses under
 * prefers-reduced-motion.
 *
 * Rounding: the headline agreement % is the rounded 4-share plus the
 * rounded 5-share — the report's own rounding, which is what makes the
 * full-sample ladder read 78 / 64 / 53 (exact-sum rounding would say 77 /
 * 64 / 52). Geometry uses exact shares; only labels round.
 */

import { useState } from 'react';

import { ChartCard } from '../components/ChartCard';
import { DimmablePanel, ModuleSection } from '../components/ModuleSection';
import { useStrings, type UIStrings } from '../i18n';
import { makeBase } from '../lib/base-count';
import { cn } from '../lib/cn';
import { summariseLikert, type LikertSummary } from '../lib/stats';
import { useFilters } from '../state/filter-context';
import type { EmployeeRecord } from '../../../types/survey';

type View = 'agree' | 'mean' | 'dist';

const RUNGS: { id: 'confidence_self' | 'confidence_employer' | 'confidence_sector' }[] = [
  { id: 'confidence_self' },
  { id: 'confidence_employer' },
  { id: 'confidence_sector' },
];

const LIK_COLORS = [
  'var(--sh-lik-1)',
  'var(--sh-lik-2)',
  'var(--sh-lik-3)',
  'var(--sh-lik-4)',
  'var(--sh-lik-5)',
];
/** Ink on the pale neutral segment, white on the saturated ends. */
const LIK_TEXT = ['#FFFFFF', 'var(--sh-ink)', 'var(--sh-ink)', 'var(--sh-ink)', '#FFFFFF'];

/* SVG layout (viewBox units). */
const W = 760;
const TRACK_X = 128;
const TRACK_W = 470;
const PCT_X = 632;
const RUNG_H = 34;
const RUNG_GAP = 48;
const TOP = 16;
const H = TOP + 3 * RUNG_H + 2 * RUNG_GAP + 34;

export function ConfidenceLadder() {
  const { state, filteredEmployees, employeeBase } = useFilters();
  const t = useStrings(state.language);
  const [view, setView] = useState<View>('agree');

  const dimmed = state.lens !== 'employees';
  const dimNote = state.lens === 'employers' ? t.dimmedEmployerLens : t.dimmedCompareLens;

  const rungLabels: Record<string, { short: string; full: string }> = {
    confidence_self: { short: t.ladderSelf, full: t.ladderSelfFull },
    confidence_employer: { short: t.ladderEmployer, full: t.ladderEmployerFull },
    confidence_sector: { short: t.ladderSector, full: t.ladderSectorFull },
  };

  const summaries = RUNGS.map(({ id }) => ({
    id,
    ...rungLabels[id]!,
    summary: summariseLikert(filteredEmployees, (r: EmployeeRecord) => r[id]),
  }));

  // The base is item-specific: the smallest answered count across the three
  // rungs governs suppression (all three are fully answered at full sample).
  const minAnswered = Math.min(...summaries.map((s) => s.summary.n));
  const base = makeBase(minAnswered, employeeBase.total);

  const table = {
    headers: [
      '',
      '1',
      '2',
      '3',
      '4',
      '5',
      t.ladderViewAgree,
      t.ladderViewMean,
    ],
    rows: summaries.map((s) => [
      s.short,
      ...s.summary.counts,
      `${s.summary.agreePct}% (n = ${s.summary.agreeCount})`,
      s.summary.mean ?? '—',
    ]),
  };

  const aria = `${t.ladderTitle}: ${summaries
    .map((s) => `${s.short} ${s.summary.agreePct}%`)
    .join(', ')} (n = ${base.n}).`;

  return (
    <ModuleSection id="confidence-ladder" title={t.ladderTitle} intro={t.ladderIntro}>
      <DimmablePanel dimmed={dimmed} note={dimNote}>
        <ChartCard
          title={t.ladderTitle}
          base={base}
          series="employee"
          table={table}
          ariaLabel={aria}
          footnote={t.ladderFootnote}
        >
          <div role="group" aria-label={t.ladderTitle} className="mb-4 flex flex-wrap gap-1 rounded-lg border border-sh-rule p-0.5 sm:inline-flex">
            {(
              [
                ['agree', t.ladderViewAgree],
                ['mean', t.ladderViewMean],
                ['dist', t.ladderViewDist],
              ] as [View, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sh-tick font-medium',
                  view === v ? 'bg-sh-deep text-sh-surface' : 'text-sh-muted hover:text-sh-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <LadderSvg summaries={summaries} view={view} t={t} />

          <p className="mt-4 max-w-2xl border-l-2 border-sh-employee pl-3 text-sh-chart text-sh-muted">
            {t.ladderAnnotation}
          </p>
        </ChartCard>
      </DimmablePanel>
    </ModuleSection>
  );
}

function LadderSvg({
  summaries,
  view,
  t,
}: {
  summaries: { id: string; short: string; full: string; summary: LikertSummary }[];
  view: View;
  t: UIStrings;
}) {
  const rungY = (i: number) => TOP + i * (RUNG_H + RUNG_GAP);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="presentation"
      aria-hidden="true"
      style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}
    >
      {/* Drop connectors between agreement edges (agree view only). */}
      {view === 'agree' &&
        summaries.slice(0, -1).map((s, i) => {
          const next = summaries[i + 1]!;
          const x1 = TRACK_X + (s.summary.agree4Pct + s.summary.agree5Pct) * (TRACK_W / 100);
          const x2 = TRACK_X + (next.summary.agree4Pct + next.summary.agree5Pct) * (TRACK_W / 100);
          const y1 = rungY(i) + RUNG_H;
          const y2 = rungY(i + 1);
          const drop = next.summary.agreePct - s.summary.agreePct;
          return (
            <g key={`drop-${s.id}`}>
              <line
                className="sh-anim"
                x1={x1}
                y1={y1 + 2}
                x2={x2}
                y2={y2 - 2}
                stroke="var(--sh-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text
                x={Math.max(x1, x2) + 12}
                y={(y1 + y2) / 2 + 4}
                fontSize={12}
                fill="var(--sh-muted)"
                className="sh-num"
              >
                {drop > 0 ? `+${drop}` : drop} pts
              </text>
            </g>
          );
        })}

      {summaries.map((s, i) => {
        const y = rungY(i);
        const { summary } = s;
        return (
          <g key={s.id}>
            <title>
              {`${s.full} — ${summary.agreePct}% ${t.agreeing} (n = ${summary.agreeCount} / ${summary.n}) · ${t.meanScore} ${summary.mean ?? '—'}`}
            </title>

            {/* Rung label */}
            <text x={0} y={y + RUNG_H / 2 - 2} fontSize={15} fontWeight={600} fill="var(--sh-deep)">
              {s.short}
            </text>
            <text x={0} y={y + RUNG_H / 2 + 14} fontSize={11} fill="var(--sh-muted)" className="sh-num">
              n = {summary.n}
            </text>

            {/* Track */}
            <rect
              x={TRACK_X}
              y={y}
              width={TRACK_W}
              height={RUNG_H}
              rx={4}
              fill="var(--sh-sand)"
              stroke="var(--sh-rule)"
            />

            {view === 'agree' && <AgreeRung summary={summary} y={y} />}
            {view === 'mean' && <MeanRung summary={summary} y={y} isLast={i === summaries.length - 1} />}
            {view === 'dist' && <DistRung summary={summary} y={y} t={t} isLast={i === summaries.length - 1} />}

            {/* The big figure at the right (§6.3). */}
            <text
              x={PCT_X}
              y={y + RUNG_H - 3}
              fontSize={40}
              fontWeight={700}
              fill="var(--sh-deep)"
              className="sh-num"
            >
              {view === 'mean' ? (summary.mean ?? '—') : `${summary.agreePct}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Stacked agreement bar: strongly-agree (solid amber) then agree (soft amber), 2px gap. */
function AgreeRung({ summary, y }: { summary: LikertSummary; y: number }) {
  const w5 = (summary.shares[4] / 100) * TRACK_W;
  const w4 = (summary.shares[3] / 100) * TRACK_W;
  return (
    <g>
      <rect
        className="sh-anim"
        x={TRACK_X}
        y={y}
        width={Math.max(w5, 0)}
        height={RUNG_H}
        rx={4}
        fill="var(--sh-employee)"
        stroke="rgba(20,24,29,0.18)"
        strokeWidth={1}
      />
      <rect
        className="sh-anim"
        x={TRACK_X + w5 + (w5 > 0 && w4 > 0 ? 2 : 0)}
        y={y}
        width={Math.max(w4 - (w5 > 0 && w4 > 0 ? 2 : 0), 0)}
        height={RUNG_H}
        rx={4}
        fill="var(--sh-employee-soft)"
        stroke="rgba(20,24,29,0.18)"
        strokeWidth={1}
      />
      {/* Selective direct labels on the segments when they have room. */}
      {w5 > 34 && (
        <text x={TRACK_X + w5 / 2} y={y + RUNG_H / 2 + 4} fontSize={12} textAnchor="middle" fill="var(--sh-ink)" className="sh-num">
          {summary.agree5Pct}%
        </text>
      )}
      {w4 > 34 && (
        <text x={TRACK_X + w5 + 2 + (w4 - 2) / 2} y={y + RUNG_H / 2 + 4} fontSize={12} textAnchor="middle" fill="var(--sh-ink)" className="sh-num">
          {summary.agree4Pct}%
        </text>
      )}
    </g>
  );
}

/** Mean score on a 1–5 axis. */
function MeanRung({ summary, y, isLast }: { summary: LikertSummary; y: number; isLast: boolean }) {
  const x = (v: number) => TRACK_X + ((v - 1) / 4) * TRACK_W;
  const mean = summary.mean;
  return (
    <g>
      {mean !== null && (
        <rect
          className="sh-anim"
          x={TRACK_X}
          y={y}
          width={Math.max(x(mean) - TRACK_X, 0)}
          height={RUNG_H}
          rx={4}
          fill="var(--sh-employee)"
          stroke="rgba(20,24,29,0.18)"
          strokeWidth={1}
        />
      )}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y + RUNG_H} x2={x(v)} y2={y + RUNG_H + 5} stroke="var(--sh-rule)" />
          {isLast && (
            <text x={x(v)} y={y + RUNG_H + 18} fontSize={11} textAnchor="middle" fill="var(--sh-muted)" className="sh-num">
              {v}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

/** Full 5-point distribution in the diverging Likert colours, 2px gaps. */
function DistRung({
  summary,
  y,
  t,
  isLast,
}: {
  summary: LikertSummary;
  y: number;
  t: UIStrings;
  isLast: boolean;
}) {
  let cursor = TRACK_X;
  const segments = summary.shares.map((share, i) => {
    const w = (share / 100) * TRACK_W;
    const seg = { i, x: cursor, w: Math.max(w - (w > 0 ? 2 : 0), 0), share, count: summary.counts[i]! };
    cursor += w;
    return seg;
  });
  return (
    <g>
      {segments.map((seg) => (
        <g key={seg.i}>
          <title>{`${seg.i + 1}: ${Math.round(seg.share)}% (n = ${seg.count})`}</title>
          <rect
            className="sh-anim"
            x={seg.x}
            y={y}
            width={seg.w}
            height={RUNG_H}
            fill={LIK_COLORS[seg.i]}
            stroke="rgba(20,24,29,0.18)"
            strokeWidth={0.75}
          />
          {seg.w > 34 && (
            <text
              x={seg.x + seg.w / 2}
              y={y + RUNG_H / 2 + 4}
              fontSize={11}
              textAnchor="middle"
              fill={LIK_TEXT[seg.i]}
              className="sh-num"
            >
              {Math.round(seg.share)}%
            </text>
          )}
        </g>
      ))}
      {/* Directional labels — colour is never the only channel (§8). */}
      {isLast && (
        <g>
          <text x={TRACK_X} y={y + RUNG_H + 16} fontSize={11} fill="var(--sh-muted)">
            ← 1–2 {t.likertDisagree}
          </text>
          <text x={TRACK_X + TRACK_W} y={y + RUNG_H + 16} fontSize={11} textAnchor="end" fill="var(--sh-muted)">
            4–5 {t.likertAgree} →
          </text>
        </g>
      )}
    </g>
  );
}
