/**
 * Diverging stacked Likert bars centred on neutral (§6.4, §6.5). Custom
 * SVG: the neutral segment straddles the centre axis, disagreement extends
 * left, agreement right, with 2px surface gaps between segments. Supports
 * the full 5-point scale and the collapsed 3-point view, plus mean-score
 * chips. Geometry transitions 200 ms ease-out via .sh-anim; segment
 * identity is carried by the legend and direct labels, never colour alone.
 */

import { useStrings } from '../i18n';
import type { LikertItem } from '../lib/module-data';
import { useFilters } from '../state/filter-context';

export type LikertScale = '5' | '3';

const W = 760;
const LABEL_W = 208;
const TRACK_X = 216;
const TRACK_W = 440;
const CENTER = TRACK_X + TRACK_W / 2;
/** 100% of one side spans half the track. */
const PX_PER_PCT = TRACK_W / 2 / 100;
const ROW_H = 30;
const ROW_GAP = 16;
const TOP = 8;
const GAP = 2;

const LIK = ['var(--sh-lik-1)', 'var(--sh-lik-2)', 'var(--sh-lik-3)', 'var(--sh-lik-4)', 'var(--sh-lik-5)'];
const LIK_TEXT = ['#FFFFFF', 'var(--sh-ink)', 'var(--sh-ink)', 'var(--sh-ink)', '#FFFFFF'];

interface Segment {
  x: number;
  w: number;
  fill: string;
  text: string;
  pct: number;
  count: number;
  label: string;
}

function segmentsFor(item: LikertItem, scale: LikertScale, scaleLabels: string[]): Segment[] {
  const { shares, counts } = item.summary;
  const segs: Segment[] = [];

  const push = (
    x: number,
    w: number,
    idx: number,
    pct: number,
    count: number,
    label: string,
  ) => {
    if (w <= 0) return;
    segs.push({ x, w, fill: LIK[idx]!, text: LIK_TEXT[idx]!, pct, count, label });
  };

  if (scale === '5') {
    const nHalf = (shares[2] / 2) * PX_PER_PCT;
    // Left of centre, outward: neutral half → 2 → 1.
    const w2 = shares[1] * PX_PER_PCT;
    const w1 = shares[0] * PX_PER_PCT;
    push(CENTER - nHalf, nHalf * 2, 2, shares[2], counts[2], scaleLabels[2]!);
    push(CENTER - nHalf - GAP - w2, w2, 1, shares[1], counts[1], scaleLabels[1]!);
    push(CENTER - nHalf - GAP - w2 - GAP - w1, w1, 0, shares[0], counts[0], scaleLabels[0]!);
    // Right of centre: 4 → 5.
    const w4 = shares[3] * PX_PER_PCT;
    const w5 = shares[4] * PX_PER_PCT;
    push(CENTER + nHalf + GAP, w4, 3, shares[3], counts[3], scaleLabels[3]!);
    push(CENTER + nHalf + GAP + w4 + GAP, w5, 4, shares[4], counts[4], scaleLabels[4]!);
  } else {
    const disagreePct = shares[0] + shares[1];
    const agreePct = shares[3] + shares[4];
    const nHalf = (shares[2] / 2) * PX_PER_PCT;
    const wd = disagreePct * PX_PER_PCT;
    const wa = agreePct * PX_PER_PCT;
    push(CENTER - nHalf, nHalf * 2, 2, shares[2], counts[2], scaleLabels[1]!);
    push(CENTER - nHalf - GAP - wd, wd, 1, disagreePct, counts[0] + counts[1], scaleLabels[0]!);
    push(CENTER + nHalf + GAP, wa, 3, agreePct, counts[3] + counts[4], scaleLabels[2]!);
  }
  return segs;
}

export function DivergingLikertChart({
  items,
  scale,
  showMean,
  baseTotal,
}: {
  items: LikertItem[];
  scale: LikertScale;
  showMean: boolean;
  /** Dataset base under the current filter; items with fewer answers get their own n. */
  baseTotal: number;
}) {
  const { state } = useFilters();
  const t = useStrings(state.language);
  const height = TOP + items.length * (ROW_H + ROW_GAP);

  const fiveLabels = ['1', '2', '3', '4', '5'].map(
    (v, i) =>
      `${v} — ${[t.likertDisagree, t.likertDisagree, t.likertNeutral, t.likertAgree, t.likertAgree][i]}`,
  );
  const threeLabels = [t.likertDisagree, t.likertNeutral, t.likertAgree];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      role="presentation"
      aria-hidden="true"
      style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}
    >
      {/* Centre axis */}
      <line
        x1={CENTER}
        y1={0}
        x2={CENTER}
        y2={height - 6}
        stroke="var(--sh-rule)"
        strokeWidth={1}
      />
      {items.map((item, i) => {
        const y = TOP + i * (ROW_H + ROW_GAP);
        const segs = segmentsFor(
          item,
          scale,
          scale === '5' ? fiveLabels : threeLabels,
        );
        return (
          <g key={item.id}>
            <title>{`${item.fullLabel} (n = ${item.summary.n})`}</title>
            <text
              x={0}
              y={y + ROW_H / 2 - 2}
              fontSize={12.5}
              fontWeight={600}
              fill="var(--sh-deep)"
            >
              {item.label.length > 30 ? `${item.label.slice(0, 29)}…` : item.label}
            </text>
            <text x={0} y={y + ROW_H / 2 + 12} fontSize={10.5} fill="var(--sh-muted)" className="sh-num">
              {item.summary.n < baseTotal ? `n = ${item.summary.n} ✳` : `n = ${item.summary.n}`}
            </text>
            {segs.map((s, si) => (
              <g key={si}>
                <title>{`${item.label} — ${s.label}: ${Math.round(s.pct)}% (n = ${s.count})`}</title>
                <rect
                  className="sh-anim"
                  x={s.x}
                  y={y}
                  width={s.w}
                  height={ROW_H}
                  fill={s.fill}
                  stroke="rgba(20,24,29,0.15)"
                  strokeWidth={0.75}
                />
                {s.w > 30 && (
                  <text
                    x={s.x + s.w / 2}
                    y={y + ROW_H / 2 + 4}
                    fontSize={10.5}
                    textAnchor="middle"
                    fill={s.text}
                    className="sh-num"
                  >
                    {Math.round(s.pct)}%
                  </text>
                )}
              </g>
            ))}
            {showMean && item.summary.mean !== null && (
              <text
                x={W - 4}
                y={y + ROW_H / 2 + 4}
                fontSize={12}
                textAnchor="end"
                fill="var(--sh-deep)"
                fontWeight={600}
                className="sh-num"
              >
                {`x̄ ${item.summary.mean.toFixed(1)}`}
              </text>
            )}
          </g>
        );
      })}
      {/* Directional labels under the last row — never colour alone (§8). */}
      <text x={TRACK_X} y={height - 2} fontSize={11} fill="var(--sh-muted)">
        {`← ${t.likertDisagree}`}
      </text>
      <text x={TRACK_X + TRACK_W} y={height - 2} fontSize={11} textAnchor="end" fill="var(--sh-muted)">
        {`${t.likertAgree} →`}
      </text>
    </svg>
  );
}

/** HTML legend for the Likert colours; identity never rides on colour alone. */
export function LikertLegend({ scale }: { scale: LikertScale }) {
  const { state } = useFilters();
  const t = useStrings(state.language);
  const entries =
    scale === '5'
      ? [
          { color: LIK[0]!, label: `1 · ${t.likertDisagree}` },
          { color: LIK[1]!, label: '2' },
          { color: LIK[2]!, label: `3 · ${t.likertNeutral}` },
          { color: LIK[3]!, label: '4' },
          { color: LIK[4]!, label: `5 · ${t.likertAgree}` },
        ]
      : [
          { color: LIK[1]!, label: t.likertDisagree },
          { color: LIK[2]!, label: t.likertNeutral },
          { color: LIK[3]!, label: t.likertAgree },
        ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {entries.map((e) => (
        <li key={e.label} className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-sm border border-sh-rule"
            style={{ backgroundColor: e.color }}
          />
          {e.label}
        </li>
      ))}
    </ul>
  );
}
