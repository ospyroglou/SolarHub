/**
 * Tests for the explorer's state layer: filter predicates (§6.0), URL state
 * serialisation (§10), the shared base-count calculator with the §7
 * suppression rules, and the Confidence Ladder statistics (§6.3).
 */

import { describe, expect, it } from 'vitest';

import { employees, employers } from '../src/features/employment-explorer/lib/data';
import {
  baseStatus,
  itemBase,
  makeBase,
  SUPPRESS_BELOW,
  WARN_UP_TO,
} from '../src/features/employment-explorer/lib/base-count';
import {
  activeFilterCount,
  DEFAULT_FILTER_STATE,
  filterEmployees,
  filterEmployers,
  type FilterState,
} from '../src/features/employment-explorer/lib/filters';
import { summariseLikert } from '../src/features/employment-explorer/lib/stats';
import {
  parseFilterState,
  serializeFilterState,
} from '../src/features/employment-explorer/lib/url-state';
import { filterReducer } from '../src/features/employment-explorer/state/filter-context';

/* ------------------------------------------------------------------ */
/* Filter predicates                                                   */
/* ------------------------------------------------------------------ */

describe('filter predicates (§6.0)', () => {
  it('no active filters returns the full analysed sets', () => {
    expect(filterEmployees(employees, {}).length).toBe(44);
    expect(filterEmployers(employers, {}).length).toBe(20);
  });

  it('OR within a category', () => {
    const male = filterEmployees(employees, { gender: ['male'] }).length;
    const female = filterEmployees(employees, { gender: ['female'] }).length;
    const both = filterEmployees(employees, { gender: ['male', 'female'] }).length;
    expect(male).toBe(32);
    expect(female).toBe(11);
    expect(both).toBe(43); // 1 respondent preferred not to say
  });

  it('AND across categories', () => {
    const result = filterEmployees(employees, {
      gender: ['female'],
      education_level: ['bachelors'],
    });
    for (const r of result) {
      expect(r.gender).toBe('female');
      expect(r.education_level).toBe('bachelors');
    }
    expect(result.length).toBeLessThanOrEqual(11);
  });

  it('derived yes/no filters map booleans', () => {
    expect(filterEmployees(employees, { has_certificate: ['no'] }).length).toBe(16);
    expect(filterEmployees(employees, { has_certificate: ['yes'] }).length).toBe(28);
    expect(filterEmployers(employers, { is_manufacturer: ['yes'] }).length).toBe(10);
  });

  it('employer headcount bands filter on the derived field', () => {
    expect(filterEmployers(employers, { employee_count_band: ['micro'] }).length).toBe(5);
    expect(
      filterEmployers(employers, { employee_count_band: ['micro', 'corporate'] }).length,
    ).toBe(6);
  });

  it('the demo trap: women aged 45–54 is a sub-5 subset that must suppress', () => {
    const subset = filterEmployees(employees, {
      gender: ['female'],
      age: ['45_54'],
    });
    expect(subset.length).toBeLessThan(SUPPRESS_BELOW);
    expect(baseStatus(subset.length)).toBe('suppressed');
  });
});

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

describe('filter reducer', () => {
  it('toggle adds and removes a value', () => {
    let state: FilterState = DEFAULT_FILTER_STATE;
    state = filterReducer(state, { type: 'toggle', dataset: 'employee', key: 'age', value: '25_34' });
    expect(state.employee['age']).toEqual(['25_34']);
    state = filterReducer(state, { type: 'toggle', dataset: 'employee', key: 'age', value: '25_34' });
    expect(state.employee['age']).toBeUndefined();
  });

  it('clearAll keeps lens and language', () => {
    let state: FilterState = {
      lens: 'compare',
      language: 'tr',
      employee: { age: ['25_34'] },
      employer: { is_manufacturer: ['yes'] },
    };
    state = filterReducer(state, { type: 'clearAll' });
    expect(state).toEqual({ lens: 'compare', language: 'tr', employee: {}, employer: {} });
  });

  it('activeFilterCount counts selected values across datasets', () => {
    const state: FilterState = {
      ...DEFAULT_FILTER_STATE,
      employee: { age: ['25_34', '35_44'] },
      employer: { is_manufacturer: ['yes'] },
    };
    expect(activeFilterCount(state)).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/* URL state (§10)                                                     */
/* ------------------------------------------------------------------ */

describe('URL state serialisation (§10)', () => {
  it('defaults serialise to an empty query', () => {
    expect(serializeFilterState(DEFAULT_FILTER_STATE)).toBe('');
  });

  it('round-trips a full state exactly', () => {
    const state: FilterState = {
      lens: 'compare',
      language: 'tr',
      employee: { age: ['25_34', '45_54'], has_certificate: ['yes'] },
      employer: { years_operating: ['4_7'], is_manufacturer: ['no'] },
    };
    const restored = parseFilterState(serializeFilterState(state));
    expect(restored).toEqual(state);
  });

  it('canonicalises value order to the dictionary order', () => {
    const a = serializeFilterState({
      ...DEFAULT_FILTER_STATE,
      employee: { age: ['45_54', '25_34'] },
    });
    const b = serializeFilterState({
      ...DEFAULT_FILTER_STATE,
      employee: { age: ['25_34', '45_54'] },
    });
    expect(a).toBe(b);
  });

  it('drops unknown lenses, languages and option values from hand-edited links', () => {
    const restored = parseFilterState(
      '?lens=hacker&lang=de&e_age=25_34.not_a_band&e_bogus=1&r_manu=maybe',
    );
    expect(restored.lens).toBe('employees');
    expect(restored.language).toBe('en');
    expect(restored.employee).toEqual({ age: ['25_34'] });
    expect(restored.employer).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
/* §7 suppression thresholds                                           */
/* ------------------------------------------------------------------ */

describe('base-count calculator (§7)', () => {
  it('suppresses below 5, warns from 5 through 15, ok above', () => {
    expect(baseStatus(0)).toBe('suppressed');
    expect(baseStatus(4)).toBe('suppressed');
    expect(baseStatus(SUPPRESS_BELOW)).toBe('warn');
    expect(baseStatus(15)).toBe('warn');
    expect(baseStatus(WARN_UP_TO + 1)).toBe('ok');
    expect(baseStatus(44)).toBe('ok');
  });

  it('makeBase carries n, total and status together', () => {
    expect(makeBase(3, 44)).toEqual({ n: 3, total: 44, status: 'suppressed' });
    expect(makeBase(12, 44)).toEqual({ n: 12, total: 44, status: 'warn' });
    expect(makeBase(44, 44)).toEqual({ n: 44, total: 44, status: 'ok' });
  });

  it('itemBase uses the answered count, not the dataset N (Q9: n = 35)', () => {
    const base = itemBase(employees, (r) => r.certificate_value !== null, 44);
    expect(base).toEqual({ n: 35, total: 44, status: 'ok' });
  });

  it('the full employer set is 20 — one employer filter can already reach warn range', () => {
    const micro = filterEmployers(employers, { employee_count_band: ['micro'] });
    expect(baseStatus(micro.length)).toBe('warn'); // n = 5
  });
});

/* ------------------------------------------------------------------ */
/* Confidence Ladder statistics (§6.3)                                 */
/* ------------------------------------------------------------------ */

describe('Confidence Ladder statistics (§6.3)', () => {
  it('full-sample ladder reads 78 / 64 / 53 with the report’s component rounding', () => {
    const self = summariseLikert(employees, (r) => r.confidence_self);
    const employer = summariseLikert(employees, (r) => r.confidence_employer);
    const sector = summariseLikert(employees, (r) => r.confidence_sector);
    expect(self.agreePct).toBe(78); // exact sum is 77.3 — see stats.ts
    expect(employer.agreePct).toBe(64);
    expect(sector.agreePct).toBe(53);
    // The underlying counts stay exact.
    expect(self.agreeCount).toBe(34);
    expect(employer.agreeCount).toBe(28);
    expect(sector.agreeCount).toBe(23);
  });

  it('distribution counts sum to the answered base', () => {
    for (const id of ['confidence_self', 'confidence_employer', 'confidence_sector'] as const) {
      const s = summariseLikert(employees, (r) => r[id]);
      expect(s.counts.reduce((a, b) => a + b, 0)).toBe(s.n);
      expect(s.n).toBe(44);
    }
  });

  it('nulls are never imputed into the ladder (certificate_value keeps n = 35)', () => {
    const s = summariseLikert(employees, (r) => r.certificate_value);
    expect(s.n).toBe(35);
  });

  it('ladder responds to filters: micro-firm subset recomputes and stays displayable', () => {
    const micro = filterEmployees(employees, { company_size: ['1_9'] });
    expect(micro.length).toBe(12);
    const self = summariseLikert(micro, (r) => r.confidence_self);
    expect(self.n).toBe(12);
    expect(baseStatus(self.n)).toBe('warn'); // renders with the amber badge
    expect(self.agreeCount + micro.filter((r) => (r.confidence_self ?? 0) <= 3).length).toBe(12);
  });
});
