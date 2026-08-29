/**
 * Shared Recharts building blocks for categorical charts. Marks are thin
 * with rounded data-ends, grids are recessive, text wears ink tokens.
 * Tooltips always pair the percentage with its count — "39% (n = 17)" (§7).
 * Amber marks get a hairline stroke: solar amber sits below 3:1 on white,
 * so every mark also carries a visible label or the table view as relief.
 *
 * Clicking a bar or slice toggles the linked global filter (§6.2) — the
 * affordance is a pointer cursor plus a hover/active outline.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useStrings } from '../i18n';
import { cn } from '../lib/cn';
import { useReducedMotion } from '../lib/hooks';
import { useFilters } from '../state/filter-context';

export interface CatDatum {
  value: string;
  label: string;
  count: number;
  pct: number;
}

/** Precomputed end-of-bar label, e.g. "17 · 39%". */
type LabelledDatum = CatDatum & { endLabel: string };

function withEndLabels(data: CatDatum[]): LabelledDatum[] {
  return data.map((d) => ({ ...d, endLabel: `${d.count} · ${Math.round(d.pct)}%` }));
}

const MARK_STROKE = 'rgba(20, 24, 29, 0.18)';

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: CatDatum & { seriesLabel?: string }; name?: string; value?: number }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter((p) => p.payload);
  if (items.length === 0) return null;
  const first = items[0]!.payload!;
  return (
    <div className="rounded-md border border-sh-rule bg-sh-surface px-3 py-2 text-sh-chart shadow-none">
      <p className="font-semibold text-sh-deep">{first.label}</p>
      <p className="sh-num text-sh-ink">
        {Math.round(first.pct)}% (n = {first.count})
      </p>
    </div>
  );
}

const TICK_STYLE = { fontSize: 12, fill: 'var(--sh-muted)' };

/** Single-series vertical bar chart over a fixed category order. */
export function CategoryBarChart({
  data,
  color,
  activeValues,
  onToggle,
  height = 220,
}: {
  data: CatDatum[];
  color: string;
  activeValues: string[];
  onToggle?: (value: string) => void;
  height?: number;
}) {
  const reduced = useReducedMotion();
  // Angle the ticks whenever labels risk colliding at card widths.
  const angled = data.length > 5 || data.some((d) => d.label.length > 7);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--sh-rule)" />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={{ stroke: 'var(--sh-rule)' }}
          interval={0}
          height={angled ? 56 : 44}
          angle={angled ? -28 : 0}
          textAnchor={angled ? 'end' : 'middle'}
        />
        <YAxis allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(20,24,29,0.05)' }} />
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reduced}
          animationDuration={200}
          animationEasing="ease-out"
        >
          <LabelList
            dataKey="count"
            position="top"
            className="sh-num"
            style={{ fontSize: 12, fill: 'var(--sh-ink)' }}
          />
          {data.map((d) => (
            <Cell
              key={d.value}
              fill={color}
              stroke={activeValues.includes(d.value) ? 'var(--sh-deep)' : MARK_STROKE}
              strokeWidth={activeValues.includes(d.value) ? 2 : 1}
              cursor={onToggle ? 'pointer' : undefined}
              onClick={onToggle ? () => onToggle(d.value) : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series horizontal bar chart (long category labels, e.g. activity fields). */
export function CategoryBarChartHorizontal({
  data,
  color,
  activeValues,
  onToggle,
  height,
  labelWidth = 190,
}: {
  data: CatDatum[];
  color: string;
  activeValues: string[];
  onToggle?: (value: string) => void;
  height?: number;
  labelWidth?: number;
}) {
  const reduced = useReducedMotion();
  const h = height ?? Math.max(140, data.length * 34 + 20);
  const labelled = withEndLabels(data);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={labelled}
        layout="vertical"
        margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
        barCategoryGap="30%"
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ ...TICK_STYLE, width: labelWidth - 10 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--sh-rule)' }}
          interval={0}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(20,24,29,0.05)' }} />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          isAnimationActive={!reduced}
          animationDuration={200}
          animationEasing="ease-out"
        >
          <LabelList
            dataKey="endLabel"
            position="right"
            className="sh-num"
            style={{ fontSize: 12, fill: 'var(--sh-ink)' }}
          />
          {data.map((d) => (
            <Cell
              key={d.value}
              fill={color}
              stroke={activeValues.includes(d.value) ? 'var(--sh-deep)' : MARK_STROKE}
              strokeWidth={activeValues.includes(d.value) ? 2 : 1}
              cursor={onToggle ? 'pointer' : undefined}
              onClick={onToggle ? () => onToggle(d.value) : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Donut for ordinal categories (education level, years operating), coloured
 * with a light→dark ramp of the dataset hue — order carries the meaning,
 * the legend carries identity, slices are separated by a 2px surface gap.
 */
export function CategoryDonut({
  data,
  ramp,
  activeValues,
  onToggle,
  height = 240,
}: {
  data: CatDatum[];
  /** One colour per option, in option order (light→dark). */
  ramp: string[];
  activeValues: string[];
  onToggle?: (value: string) => void;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const { state } = useFilters();
  const t = useStrings(state.language);
  const visible = data.filter((d) => d.count > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={visible}
            dataKey="count"
            nameKey="label"
            innerRadius="55%"
            outerRadius="88%"
            paddingAngle={1.5}
            isAnimationActive={!reduced}
            animationDuration={200}
            animationEasing="ease-out"
          >
            {visible.map((d) => {
              const idx = data.findIndex((x) => x.value === d.value);
              return (
                <Cell
                  key={d.value}
                  fill={ramp[idx] ?? ramp[ramp.length - 1]}
                  stroke={
                    activeValues.includes(d.value) ? 'var(--sh-deep)' : 'var(--sh-surface)'
                  }
                  strokeWidth={2}
                  cursor={onToggle ? 'pointer' : undefined}
                  onClick={onToggle ? () => onToggle(d.value) : undefined}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Legend: identity never rides on colour alone (§5.1, §8). */}
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label={t.category}>
        {data.map((d, i) => (
          <li key={d.value} className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
            <button
              type="button"
              onClick={onToggle ? () => onToggle(d.value) : undefined}
              className={cn(
                'flex items-center gap-1.5',
                onToggle && 'cursor-pointer hover:underline',
                activeValues.includes(d.value) && 'font-semibold underline',
              )}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-sm border"
                style={{ backgroundColor: ramp[i], borderColor: MARK_STROKE }}
              />
              {d.label}
              <span className="sh-num text-sh-muted">({d.count})</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
