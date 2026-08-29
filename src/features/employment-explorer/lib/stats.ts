/**
 * Aggregation helpers. All aggregation happens client-side at render so
 * filters recompute live (§3.5). Percentages follow §7: never more precision
 * than the report itself uses — integers by default, one decimal at most.
 */

import type { Likert } from '../../../types/survey';

export interface CategoryCount {
  value: string;
  count: number;
  /** Share of the answered base, exact (format at render time). */
  pct: number;
}

/**
 * Tally a categorical accessor over records against a fixed option order.
 * Options with zero count are kept — a filtered-away category must stay
 * visible at zero rather than vanish (colour/order stability).
 */
export function tallyCategory<R>(
  records: R[],
  accessor: (r: R) => string | null,
  optionValues: string[],
): { data: CategoryCount[]; answered: number } {
  const counts = new Map<string, number>(optionValues.map((v) => [v, 0]));
  let answered = 0;
  for (const r of records) {
    const v = accessor(r);
    if (v === null) continue;
    if (counts.has(v)) {
      counts.set(v, counts.get(v)! + 1);
      answered++;
    }
  }
  const data = optionValues.map((value) => {
    const count = counts.get(value) ?? 0;
    return { value, count, pct: answered > 0 ? (count / answered) * 100 : 0 };
  });
  return { data, answered };
}

/** Tally a multi-value accessor (e.g. certificates); pct is share of respondents. */
export function tallyMulti<R>(
  records: R[],
  accessor: (r: R) => string[],
  optionValues: string[],
): { data: CategoryCount[]; answered: number } {
  const counts = new Map<string, number>(optionValues.map((v) => [v, 0]));
  let answered = 0;
  for (const r of records) {
    const values = accessor(r);
    if (values.length === 0) continue;
    answered++;
    for (const v of values) {
      if (counts.has(v)) counts.set(v, counts.get(v)! + 1);
    }
  }
  const data = optionValues.map((value) => {
    const count = counts.get(value) ?? 0;
    return { value, count, pct: answered > 0 ? (count / answered) * 100 : 0 };
  });
  return { data, answered };
}

export interface LikertSummary {
  /** Answered count — the denominator for every share below. */
  n: number;
  /** counts[i] is the number of respondents answering i+1. */
  counts: [number, number, number, number, number];
  /** Exact shares (0–100) per scale point. */
  shares: [number, number, number, number, number];
  /**
   * Agreement % as the report computes it: the 4-share and 5-share are each
   * rounded to integers FIRST, then summed. This is what makes the
   * full-sample Confidence Ladder read 78 / 64 / 53 exactly as published
   * (exact-sum rounding would give 77 / 64 / 52). It also keeps a stacked
   * bar self-consistent: the displayed segments sum to the displayed total.
   */
  agreePct: number;
  /** Rounded component shares backing agreePct. */
  agree4Pct: number;
  agree5Pct: number;
  /** Raw agreement count (answers of 4 or 5). */
  agreeCount: number;
  /** Mean score over answered, 1 decimal. */
  mean: number | null;
}

export function summariseLikert<R>(
  records: R[],
  accessor: (r: R) => Likert,
): LikertSummary {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let n = 0;
  let sum = 0;
  for (const r of records) {
    const v = accessor(r);
    if (v === null) continue;
    counts[v - 1] = (counts[v - 1] ?? 0) + 1;
    n++;
    sum += v;
  }
  const share = (c: number) => (n > 0 ? (c / n) * 100 : 0);
  const shares = counts.map(share) as LikertSummary['shares'];
  const agree4Pct = Math.round(shares[3]);
  const agree5Pct = Math.round(shares[4]);
  return {
    n,
    counts,
    shares,
    agree4Pct,
    agree5Pct,
    agreePct: agree4Pct + agree5Pct,
    agreeCount: counts[3] + counts[4],
    mean: n > 0 ? Math.round((sum / n) * 10) / 10 : null,
  };
}

/** Integer percentage for display (§7: no implied precision). */
export function formatPct(pct: number): string {
  return `${Math.round(pct)}%`;
}

/** "39% (n = 17)" — §7: counts always accompany percentages. */
export function pctWithCount(pct: number, count: number): string {
  return `${Math.round(pct)}% (n = ${count})`;
}
