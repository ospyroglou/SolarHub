/**
 * The shared base-count calculator and the §7 small-sample integrity rules.
 *
 * EVERY chart inherits these through <ChartCard> — no module implements its
 * own thresholds. At n = 44 (employees) and n = 20 (employers) two combined
 * filters easily reach single digits; without suppression the page would
 * manufacture spurious findings ("100% of women aged 45–54 disagree").
 *
 * Rules (§7):
 *  - n < 5           → suppress the chart entirely (message instead; the
 *                      table view is withheld too — it would leak the same
 *                      small cells the chart suppresses). This also
 *                      enforces the employer cap: no employer view ever
 *                      renders fewer than 5 records.
 *  - 5 ≤ n ≤ 15      → render, with an amber "Small base — indicative only"
 *                      badge.
 *  - n > 15          → render normally.
 *
 * The base shown is always the count for the SPECIFIC item under the active
 * filter — use `itemBase` for questions with skippers (e.g. Q9
 * certificate_value, n = 35 of 44 at full base).
 */

export const SUPPRESS_BELOW = 5;
export const WARN_UP_TO = 15;

export type BaseStatus = 'ok' | 'warn' | 'suppressed';

export interface BaseInfo {
  /** Respondents behind the current view (item-specific where relevant). */
  n: number;
  /** The dataset's full analysed size (44 or 20). */
  total: number;
  status: BaseStatus;
}

export function baseStatus(n: number): BaseStatus {
  if (n < SUPPRESS_BELOW) return 'suppressed';
  if (n <= WARN_UP_TO) return 'warn';
  return 'ok';
}

export function makeBase(n: number, total: number): BaseInfo {
  return { n, total, status: baseStatus(n) };
}

/**
 * Item-level base: the number of filtered records that actually answered
 * the item (non-null / non-empty). Percentages for the item must use this
 * denominator, never the dataset N (§3.3, §7).
 */
export function itemBase<R>(
  records: R[],
  answered: (record: R) => boolean,
  total: number,
): BaseInfo {
  return makeBase(records.filter(answered).length, total);
}
