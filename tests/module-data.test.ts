/**
 * Tests for the module data builders behind §6.4–§6.12: Likert item
 * aggregation and sorting, the §6.7 asymmetry themes (including the
 * job-security bridge), the §6.8/§6.9 heatmap matrices, the §6.10
 * corrected growth figures, and the strategy-matrix filter.
 */

import { describe, expect, it } from 'vitest';

import { employees, employers, optionsOf } from '../src/features/employment-explorer/lib/data';
import { FEATURES } from '../src/features/employment-explorer/lib/features';
import {
  ASYMMETRY_LINKS,
  buildBandMatrix,
  buildEmployeeThemes,
  buildGapMatrix,
  buildLikertItems,
  buildRetentionThemes,
  buildWageDistribution,
  EDU_DIST_ROWS,
  EMPLOYEE_LIKERT_IDS,
  EMPLOYER_LIKERT_IDS,
  filterRecommendations,
  isDivergent,
  JOB_SECURITY_TR,
  PCT_BAND_VALUES,
  sortLikertItems,
  STAFF_DIST_ROWS,
  TURNOVER_BAND_VALUES,
  TURNOVER_ROWS,
} from '../src/features/employment-explorer/lib/module-data';
import { tallyCategory, tallyMulti } from '../src/features/employment-explorer/lib/stats';
import type { EmployeeRecord, EmployerRecord, Likert, Recommendation } from '../src/types/survey';

const employeeAccessor = (r: EmployeeRecord, id: string) => r[id as keyof EmployeeRecord] as Likert;
const employerAccessor = (r: EmployerRecord, id: string) => r[id as keyof EmployerRecord] as Likert;

describe('§6.4 Likert Explorer data', () => {
  it('builds exactly 13 employee and 6 employer items', () => {
    expect(buildLikertItems(employees, EMPLOYEE_LIKERT_IDS, employeeAccessor, 'en').length).toBe(13);
    expect(buildLikertItems(employers, EMPLOYER_LIKERT_IDS, employerAccessor, 'en').length).toBe(6);
  });

  it('certificate_value keeps its own n = 35 inside the item list', () => {
    const items = buildLikertItems(employees, EMPLOYEE_LIKERT_IDS, employeeAccessor, 'en');
    const cert = items.find((i) => i.id === 'certificate_value')!;
    expect(cert.summary.n).toBe(35);
    expect(items.filter((i) => i.id !== 'certificate_value').every((i) => i.summary.n === 44)).toBe(true);
  });

  it('sorts by net agreement, question order and dimension', () => {
    const items = buildLikertItems(employees, EMPLOYEE_LIKERT_IDS, employeeAccessor, 'en');
    const byNet = sortLikertItems(items, 'net');
    for (let i = 1; i < byNet.length; i++) {
      expect(byNet[i - 1]!.net).toBeGreaterThanOrEqual(byNet[i]!.net);
    }
    const byOrder = sortLikertItems(items, 'order');
    expect(byOrder.map((i) => i.id)).toEqual([...EMPLOYEE_LIKERT_IDS]);
    const byDim = sortLikertItems(items, 'dimension');
    for (let i = 1; i < byDim.length; i++) {
      expect(byDim[i - 1]!.dimension.localeCompare(byDim[i]!.dimension)).toBeLessThanOrEqual(0);
    }
  });

  it('work–life balance is the most contested employee item (net near zero)', () => {
    const items = buildLikertItems(employees, EMPLOYEE_LIKERT_IDS, employeeAccessor, 'en');
    const wlb = items.find((i) => i.id === 'work_life_balance')!;
    expect(Math.round(wlb.net)).toBe(-18); // 11 agree vs 19 disagree of 44
  });
});

describe('§6.5 wage distribution', () => {
  it('reproduces the report figures at one decimal', () => {
    const { segments, n } = buildWageDistribution(employees);
    expect(n).toBe(44);
    const pct = (v: string) => segments.find((s) => s.value === v)!.pct;
    expect(pct('lower').toFixed(1)).toBe('45.5');
    expect(pct('similar').toFixed(1)).toBe('40.9');
    expect(pct('higher').toFixed(1)).toBe('2.3');
    expect(pct('not_informed').toFixed(1)).toBe('11.4');
  });
});

describe('§6.6 education–certification matrix', () => {
  it('cross-tabulates alignment × certification over the full base', () => {
    const m = buildGapMatrix(employees);
    expect(m.n).toBe(44);
    const total =
      m.counts.aligned[0] + m.counts.aligned[1] +
      m.counts.neutral[0] + m.counts.neutral[1] +
      m.counts.misaligned[0] + m.counts.misaligned[1];
    expect(total).toBe(44);
    expect(m.counts.aligned[0] + m.counts.aligned[1]).toBe(23);
    expect(m.counts.neutral[0] + m.counts.neutral[1]).toBe(13);
    expect(m.counts.misaligned[0] + m.counts.misaligned[1]).toBe(8);
  });
});

describe('§6.7 expectation asymmetry themes', () => {
  it('ranks employee themes pay → job security → development, as §6.7 describes', () => {
    const { themes, n } = buildEmployeeThemes(employees);
    expect(n).toBe(43); // one respondent skipped the question
    const byKey = new Map(themes.map((t) => [t.key, t]));
    expect(byKey.get('pay_lagging')!.count).toBe(14);
    expect(byKey.get('pay_lagging')!.rank).toBe(1);
    expect(byKey.get('job_security')!.count).toBe(7);
    expect(byKey.get('limited_development')!.count).toBe(5);
    expect(byKey.get('job_security')!.rank).toBeLessThan(byKey.get('limited_development')!.rank);
    // The 7 job-security responses come out of _other, leaving 7 in "other".
    expect(byKey.get('other')!.count).toBe(7);
  });

  it('theme counts cover every answered respondent exactly once', () => {
    const { themes, n } = buildEmployeeThemes(employees);
    expect(themes.reduce((acc, t) => acc + t.count, 0)).toBe(n);
  });

  it('the job-security wording matches the quarantined records verbatim', () => {
    const matching = employees.filter((r) =>
      r._other.some((o) => o.question === 'loyalty_factor' && o.valueTr === JOB_SECURITY_TR),
    );
    expect(matching.length).toBe(7);
    expect(matching.every((r) => r.loyalty_factor === null)).toBe(true);
  });

  it('retention themes rank salary & bonus first', () => {
    const { themes, n } = buildRetentionThemes(employers);
    expect(n).toBe(20);
    expect(themes[0]!.key).toBe('salary_bonus');
    expect(themes[0]!.count).toBe(14);
  });

  it('job security is an unmatched, divergent link; pay↔salary is aligned', () => {
    const left = buildEmployeeThemes(employees).themes;
    const right = buildRetentionThemes(employers).themes;
    const jobLink = ASYMMETRY_LINKS.find((l) => l.left === 'job_security')!;
    expect(jobLink.right).toBeNull();
    expect(isDivergent(jobLink, left, right)).toBe(true);
    const payLink = ASYMMETRY_LINKS.find((l) => l.left === 'pay_lagging')!;
    expect(isDivergent(payLink, left, right)).toBe(false); // both rank 1
  });
});

describe('§6.8 / §6.9 heatmap matrices', () => {
  it('staff and education rows: every row sums to the 20 firms', () => {
    const matrix = buildBandMatrix(employers, [...STAFF_DIST_ROWS, ...EDU_DIST_ROWS], [...PCT_BAND_VALUES]);
    for (const row of matrix.counts) {
      expect(row.reduce((a, b) => a + b, 0)).toBe(20);
    }
  });

  it('the doctorate row is excluded from the heatmap by design (§6.8)', () => {
    expect([...EDU_DIST_ROWS]).not.toContain('edu_dist_doctorate');
    expect(employers.every((r) => r.edu_dist_doctorate === '0_20')).toBe(true);
  });

  it('turnover matrix: 8 staff groups × 5 bands, rows sum to 20', () => {
    const matrix = buildBandMatrix(employers, [...TURNOVER_ROWS], [...TURNOVER_BAND_VALUES]);
    expect(matrix.counts.length).toBe(8);
    for (const row of matrix.counts) {
      expect(row.length).toBe(5);
      expect(row.reduce((a, b) => a + b, 0)).toBe(20);
    }
  });
});

describe('§6.10 growth outlook figures', () => {
  it('the corrected executive-summary split: 45% expect 0–25%, 25% expect more', () => {
    const change = tallyCategory(
      employers,
      (r) => r.employment_change_2y,
      optionsOf('employment_change_2y').map((o) => o.value),
    );
    const pct = (v: string) => Math.round(change.data.find((d) => d.value === v)!.pct);
    expect(pct('increase_0_25')).toBe(45);
    expect(pct('increase_over_25')).toBe(25);
    expect(pct('increase_0_25') + pct('increase_over_25')).toBe(70); // "some increase"
  });

  it('investment speed drives 95%; the O&M option was selected by nobody', () => {
    const drivers = tallyMulti(
      employers,
      (r) => r.employment_change_drivers,
      optionsOf('employment_change_drivers').map((o) => o.value),
    );
    expect(Math.round(drivers.data.find((d) => d.value === 'investment_speed')!.pct)).toBe(95);
    expect(drivers.data.find((d) => d.value === 'om_requirements')!.count).toBe(0);
    // The option stays visible at zero rather than vanishing.
    expect(drivers.data.map((d) => d.value)).toContain('om_requirements');
  });

  it('five employers named incentives outside the defined options (footnote source)', () => {
    const n = employers.filter((r) =>
      r._other.some((o) => o.question === 'employment_change_drivers' && o.valueTr === 'Teşvikler'),
    ).length;
    expect(n).toBe(5);
  });
});

describe('§6.9 feature flag', () => {
  it('ships OFF pending authorial clearance', () => {
    expect(FEATURES.turnoverModule).toBe(false);
  });
});

describe('§6.12 strategy matrix filter', () => {
  const fixture: Recommendation[] = [
    {
      id: 'r1', textEn: 'A', textTr: 'A',
      stakeholders: [{ group: 'Employers', role: 'primary' }, { group: 'Public', role: 'secondary' }],
    },
    { id: 'r2', textEn: 'B', textTr: 'B', stakeholders: [{ group: 'Academia', role: 'primary' }] },
    { id: 'r3', textEn: 'C', textTr: 'C', stakeholders: [{ group: 'Public', role: 'primary' }] },
  ];

  it('null stakeholder returns everything; a group returns only its rows', () => {
    expect(filterRecommendations(fixture, null).length).toBe(3);
    expect(filterRecommendations(fixture, 'Public').map((r) => r.id)).toEqual(['r1', 'r3']);
    expect(filterRecommendations(fixture, 'Finance').length).toBe(0);
  });
});
