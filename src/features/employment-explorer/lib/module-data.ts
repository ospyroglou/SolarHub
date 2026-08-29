/**
 * Pure data builders for modules §6.4–§6.10. Kept free of React so the
 * aggregation logic is unit-testable; modules only render what these
 * return. All aggregation runs on the FILTERED record sets passed in.
 */

import type {
  EmployeeRecord,
  EmployerRecord,
  Likert,
  Recommendation,
  StakeholderGroup,
} from '../../../types/survey';
import { getQuestion, optionsOf, type Language } from './data';
import { summariseLikert, tallyCategory, tallyMulti, type LikertSummary } from './stats';

/* ------------------------------------------------------------------ */
/* §6.4 Likert Explorer                                                */
/* ------------------------------------------------------------------ */

export const EMPLOYEE_LIKERT_IDS = [
  'education_role_match',
  'certificate_value',
  'training_support',
  'pay_fairness',
  'rights_compliance',
  'field_allowances',
  'confidence_self',
  'confidence_employer',
  'clean_energy_satisfaction',
  'work_life_balance',
  'confidence_sector',
  'mobility_willingness',
  'development_intent',
] as const;

export const EMPLOYER_LIKERT_IDS = [
  'certified_performance',
  'poaching_frequency',
  'graduate_readiness',
  'regulatory_complexity',
  'outflow_other_sectors',
  'field_fatigue',
] as const;

export interface LikertItem {
  id: string;
  /** ≤40-char label from the dictionary, per locale. */
  label: string;
  /** Full question wording, per locale. */
  fullLabel: string;
  dimension: string;
  summary: LikertSummary;
  /** Net agreement in points: agree% − disagree% (exact shares). */
  net: number;
  /** Original questionnaire position, for the "question order" sort. */
  order: number;
  notes?: string;
}

export function buildLikertItems<R>(
  records: R[],
  ids: readonly string[],
  accessor: (r: R, id: string) => Likert,
  lang: Language,
): LikertItem[] {
  return ids.map((id, order) => {
    const q = getQuestion(id);
    const summary = summariseLikert(records, (r) => accessor(r, id));
    return {
      id,
      label: q.shortLabel,
      fullLabel: lang === 'tr' ? q.labelTr : q.labelEn,
      dimension: q.dimension,
      summary,
      net: summary.shares[3] + summary.shares[4] - (summary.shares[0] + summary.shares[1]),
      order,
      ...(q.notes ? { notes: q.notes } : {}),
    };
  });
}

export type LikertSort = 'net' | 'order' | 'dimension';

export function sortLikertItems(items: LikertItem[], sort: LikertSort): LikertItem[] {
  const copy = [...items];
  if (sort === 'net') copy.sort((a, b) => b.net - a.net);
  else if (sort === 'dimension')
    copy.sort((a, b) => a.dimension.localeCompare(b.dimension) || a.order - b.order);
  else copy.sort((a, b) => a.order - b.order);
  return copy;
}

/* ------------------------------------------------------------------ */
/* §6.5 Wage comparison                                                */
/* ------------------------------------------------------------------ */

export interface WageSegment {
  value: string;
  count: number;
  /** Exact share of answered; the module renders one decimal, matching the report. */
  pct: number;
}

export function buildWageDistribution(records: EmployeeRecord[]): {
  segments: WageSegment[];
  n: number;
} {
  const { data, answered } = tallyCategory(
    records,
    (r) => r.wage_comparison,
    optionsOf('wage_comparison').map((o) => o.value),
  );
  return { segments: data, n: answered };
}

/* ------------------------------------------------------------------ */
/* §6.6 Education–certification matrix                                 */
/* ------------------------------------------------------------------ */

export const MATCH_BANDS = ['aligned', 'neutral', 'misaligned'] as const;

export interface GapMatrix {
  /** counts[band][certYes ? 0 : 1] */
  counts: Record<(typeof MATCH_BANDS)[number], [number, number]>;
  n: number;
}

export function buildGapMatrix(records: EmployeeRecord[]): GapMatrix {
  const counts: GapMatrix['counts'] = {
    aligned: [0, 0],
    neutral: [0, 0],
    misaligned: [0, 0],
  };
  let n = 0;
  for (const r of records) {
    if (r.education_match_band === null) continue;
    counts[r.education_match_band][r.has_certificate ? 0 : 1]++;
    n++;
  }
  return { counts, n };
}

/* ------------------------------------------------------------------ */
/* §6.7 Expectation Asymmetry                                          */
/* ------------------------------------------------------------------ */

/**
 * The structured job-security wording that BuildSpec §4.1 omits from the
 * loyalty_factor options (see REPORT.md #3). Seven respondents share it
 * verbatim, and §6.7's own ranking — pay first, THEN JOB SECURITY, then
 * development — requires it as a theme. The ETL keeps these responses in
 * `_other` per the non-negotiable quarantine rule; this UI-layer constant
 * counts them as their own theme, pending sign-off of a 7th option.
 */
export const JOB_SECURITY_TR =
  'İş güvencesi eksikliği (işin sürekli olmaması, sözleşmelerin proje bazlı olması)';

export interface RankedTheme {
  key: string;
  count: number;
  /** 1-based rank after sorting by count desc (ties keep listed order). */
  rank: number;
}

/** Left side: what employees say keeps them in the sector (loyalty_factor). */
export function buildEmployeeThemes(records: EmployeeRecord[]): {
  themes: RankedTheme[];
  n: number;
} {
  const defined = optionsOf('loyalty_factor').map((o) => o.value);
  const counts = new Map<string, number>(defined.map((v) => [v, 0]));
  counts.set('job_security', 0);
  counts.set('other', 0);
  let n = 0;
  for (const r of records) {
    if (r.loyalty_factor !== null) {
      counts.set(r.loyalty_factor, (counts.get(r.loyalty_factor) ?? 0) + 1);
      n++;
      continue;
    }
    const other = r._other.find((o) => o.question === 'loyalty_factor');
    if (!other) continue; // genuinely unanswered
    n++;
    if (other.valueTr === JOB_SECURITY_TR) {
      counts.set('job_security', counts.get('job_security')! + 1);
    } else {
      counts.set('other', counts.get('other')! + 1);
    }
  }
  const themes = [...counts.entries()]
    .map(([key, count]) => ({ key, count, rank: 0 }))
    .sort((a, b) => b.count - a.count);
  themes.forEach((t, i) => {
    t.rank = i + 1;
  });
  return { themes, n };
}

/** Right side: what employers actually use to retain staff (retention_methods). */
export function buildRetentionThemes(records: EmployerRecord[]): {
  themes: RankedTheme[];
  n: number;
} {
  const { data, answered } = tallyMulti(
    records,
    (r) => r.retention_methods,
    optionsOf('retention_methods').map((o) => o.value),
  );
  const themes = data
    .map((d) => ({ key: d.value, count: d.count, rank: 0 }))
    .sort((a, b) => b.count - a.count);
  themes.forEach((t, i) => {
    t.rank = i + 1;
  });
  return { themes, n: answered };
}

/**
 * Editorial correspondence between employee priorities and employer
 * retention practice. `null` on the right marks a priority no retention
 * method addresses — drawn as an unmatched (alert) stub.
 */
export const ASYMMETRY_LINKS: {
  left: string;
  right: string | null;
}[] = [
  { left: 'pay_lagging', right: 'salary_bonus' },
  { left: 'job_security', right: null }, // nothing in the retention toolkit answers it
  { left: 'limited_development', right: 'career_development' },
  { left: 'fringe_benefits', right: 'insurance_support' },
];

/** A link diverges when the two sides' ranks differ by 2 or more. */
export function isDivergent(
  link: { left: string; right: string | null },
  leftThemes: RankedTheme[],
  rightThemes: RankedTheme[],
): boolean {
  if (link.right === null) return true;
  const l = leftThemes.find((t) => t.key === link.left);
  const r = rightThemes.find((t) => t.key === link.right);
  if (!l || !r) return false;
  return Math.abs(l.rank - r.rank) >= 2;
}

/* ------------------------------------------------------------------ */
/* §6.8 / §6.9 heatmap matrices                                        */
/* ------------------------------------------------------------------ */

export interface HeatmapMatrix {
  rowIds: string[];
  colValues: string[];
  /** counts[row][col] = number of firms. */
  counts: number[][];
  max: number;
}

export function buildBandMatrix(
  records: EmployerRecord[],
  rowIds: string[],
  colValues: string[],
): HeatmapMatrix {
  const counts = rowIds.map((rowId) => {
    const row = colValues.map(
      (col) =>
        records.filter((r) => (r as unknown as Record<string, unknown>)[rowId] === col).length,
    );
    return row;
  });
  const max = Math.max(1, ...counts.flat());
  return { rowIds, colValues, counts, max };
}

export const STAFF_DIST_ROWS = [
  'staff_dist_project_dev',
  'staff_dist_install',
  'staff_dist_manufacturing',
  'staff_dist_admin',
  'staff_dist_sales',
] as const;

/** edu_dist_doctorate is deliberately absent: zero variance, rendered as a statement (§6.8). */
export const EDU_DIST_ROWS = [
  'edu_dist_postgrad',
  'edu_dist_bachelor',
  'edu_dist_associate',
  'edu_dist_secondary',
  'edu_dist_primary',
] as const;

export const TURNOVER_ROWS = [
  'turnover_manager',
  'turnover_project_specialist',
  'turnover_rd_engineer',
  'turnover_project_technical',
  'turnover_entry_engineer',
  'turnover_technician',
  'turnover_field_worker',
  'turnover_admin',
] as const;

export const PCT_BAND_VALUES = ['0_20', '21_40', '41_60', '61_plus'] as const;
export const TURNOVER_BAND_VALUES = ['0_10', '11_20', '21_30', '31_40', '41_plus'] as const;

/* ------------------------------------------------------------------ */
/* §6.12 Strategy matrix                                               */
/* ------------------------------------------------------------------ */

export function filterRecommendations(
  recommendations: Recommendation[],
  stakeholder: StakeholderGroup | null,
): Recommendation[] {
  if (stakeholder === null) return recommendations;
  return recommendations.filter((r) => r.stakeholders.some((s) => s.group === stakeholder));
}
