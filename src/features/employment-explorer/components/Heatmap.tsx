/**
 * Band-count heatmap (§6.8, §6.9). Rows are staff groups or education
 * levels, columns are percentage/turnover bands, cell intensity is the
 * number of firms. Custom SVG — every cell carries its count as a direct
 * label (colour is never the only channel) plus a hover tooltip.
 */

import type { HeatmapMatrix } from '../lib/module-data';

/** Teal sequential ramp, light→dark; index 0 is the zero-count surface. */
const HEAT = ['var(--sh-sand)', '#DCEAE8', '#B7D6D2', '#8FBFB8', '#5FA49B', '#1B7F79'];
const HEAT_TEXT = [
  'var(--sh-muted)',
  'var(--sh-ink)',
  'var(--sh-ink)',
  'var(--sh-ink)',
  '#FFFFFF',
  '#FFFFFF',
];

const LABEL_W = 220;
const CELL_W = 96;
const CELL_H = 34;
const HEADER_H = 26;
const CELL_GAP = 2;
const GROUP_GAP = 14;

export function Heatmap({
  matrix,
  rowLabels,
  colLabels,
  /** Extra vertical gap after this 0-based row index (staff vs education groups). */
  separatorAfter,
  /** Builds each cell's tooltip text. */
  tooltip,
}: {
  matrix: HeatmapMatrix;
  rowLabels: string[];
  colLabels: string[];
  separatorAfter?: number;
  tooltip: (rowLabel: string, colLabel: string, count: number) => string;
}) {
  const cols = matrix.colValues.length;
  const width = LABEL_W + cols * (CELL_W + CELL_GAP);
  const rowY = (i: number) =>
    HEADER_H +
    i * (CELL_H + CELL_GAP) +
    (separatorAfter !== undefined && i > separatorAfter ? GROUP_GAP : 0);
  const height = rowY(matrix.rowIds.length - 1) + CELL_H + 6;

  const step = (count: number) =>
    count === 0 ? 0 : Math.min(5, Math.max(1, Math.ceil((count / matrix.max) * 5)));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="presentation"
      aria-hidden="true"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {colLabels.map((label, c) => (
        <text
          key={c}
          x={LABEL_W + c * (CELL_W + CELL_GAP) + CELL_W / 2}
          y={HEADER_H - 10}
          fontSize={11.5}
          textAnchor="middle"
          fill="var(--sh-muted)"
        >
          {label}
        </text>
      ))}
      {matrix.rowIds.map((rowId, r) => {
        const y = rowY(r);
        return (
          <g key={rowId}>
            <text
              x={LABEL_W - 10}
              y={y + CELL_H / 2 + 4}
              fontSize={12}
              textAnchor="end"
              fill="var(--sh-deep)"
            >
              {rowLabels[r]}
            </text>
            {matrix.colValues.map((_, c) => {
              const count = matrix.counts[r]?.[c] ?? 0;
              const s = step(count);
              const x = LABEL_W + c * (CELL_W + CELL_GAP);
              return (
                <g key={c}>
                  <title>{tooltip(rowLabels[r] ?? rowId, colLabels[c] ?? '', count)}</title>
                  <rect
                    className="sh-anim"
                    x={x}
                    y={y}
                    width={CELL_W}
                    height={CELL_H}
                    rx={3}
                    fill={HEAT[s]}
                    stroke="var(--sh-rule)"
                    strokeWidth={count === 0 ? 1 : 0}
                  />
                  <text
                    x={x + CELL_W / 2}
                    y={y + CELL_H / 2 + 4}
                    fontSize={11.5}
                    textAnchor="middle"
                    fill={HEAT_TEXT[s]}
                    className="sh-num"
                  >
                    {count}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
