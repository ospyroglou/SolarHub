/**
 * Test suite for the ETL (BuildSpec v1.1 §3.2 assertions, §3.1a cut-off
 * rule, §3.3 data-quality handling, §3.4 derived fields).
 *
 * The pivotal test is the raw-sheet cut-off proof: applying the 2026-03-04
 * pilot cut-off to 'ham veriler' and 'İşveren ham veriler' must reproduce
 * 44 and 20 exactly. That property — not completeness — is what makes the
 * pipeline safe to re-run against a fresh export.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import surveyData from '../src/data/survey-data.json';
import type { EmployeeRecord, EmployerRecord, Question, SurveyData } from '../src/types/survey';
import { EMPLOYEE_QUESTIONS, EMPLOYER_QUESTIONS } from '../scripts/lib/dictionary';
import {
  applyCutoff,
  CUTOFF_SERIAL,
  readSheet,
  serialToIsoDate,
  SHEET_EMPLOYEE_ANALYSED,
  SHEET_EMPLOYEE_RAW,
  SHEET_EMPLOYER_ANALYSED,
  SHEET_EMPLOYER_RAW,
} from '../scripts/lib/workbook';

const data = surveyData as unknown as SurveyData;
const employees: EmployeeRecord[] = data.employees;
const employers: EmployerRecord[] = data.employers;

const questionById = new Map<string, Question>(data.questions.map((q) => [q.id, q]));

/* ------------------------------------------------------------------ */
/* §3.1a — the pilot cut-off applied to the RAW sheets                 */
/* ------------------------------------------------------------------ */

describe('pilot cut-off on the raw sheets (§3.1a)', () => {
  const rawEmployee = readSheet(SHEET_EMPLOYEE_RAW);
  const rawEmployer = readSheet(SHEET_EMPLOYER_RAW);

  it('raw sheets hold 48 employee and 23 employer responses', () => {
    expect(rawEmployee.rows.length).toBe(48);
    expect(rawEmployer.rows.length).toBe(23);
  });

  it('the 2026-03-04 cut-off reproduces exactly 44 and 20', () => {
    expect(applyCutoff(rawEmployee.rows).length).toBe(44);
    expect(applyCutoff(rawEmployer.rows).length).toBe(20);
  });

  it('excludes exactly 4 employee and 3 employer pilot responses, all pre-launch', () => {
    const exclEmployee = rawEmployee.rows.filter((r) => r.timestamp < CUTOFF_SERIAL);
    const exclEmployer = rawEmployer.rows.filter((r) => r.timestamp < CUTOFF_SERIAL);
    expect(exclEmployee.map((r) => serialToIsoDate(r.timestamp))).toEqual([
      '2026-02-18', '2026-02-24', '2026-02-28', '2026-03-01',
    ]);
    expect(exclEmployer.map((r) => serialToIsoDate(r.timestamp))).toEqual([
      '2026-02-24', '2026-02-28', '2026-03-01',
    ]);
  });

  it('cut-off rows match the analysed sheets timestamp-for-timestamp', () => {
    const key = (rows: { timestamp: number }[]) =>
      rows.map((r) => r.timestamp).sort((a, b) => a - b);
    expect(key(applyCutoff(rawEmployee.rows))).toEqual(
      key(readSheet(SHEET_EMPLOYEE_ANALYSED).rows),
    );
    expect(key(applyCutoff(rawEmployer.rows))).toEqual(
      key(readSheet(SHEET_EMPLOYER_ANALYSED).rows),
    );
  });

  it('completeness would be the WRONG filter: it would retain 46 employees, not 44', () => {
    // Substantive employee columns are 2..25 (0-indexed 1..24); the consent
    // column is excluded from the completeness count.
    const isComplete = (cells: (string | number | boolean | null)[]) =>
      cells.slice(1, 25).every((c) => c !== null && String(c).trim() !== '');
    const completeExcluded = rawEmployee.rows.filter(
      (r) => r.timestamp < CUTOFF_SERIAL && isComplete(r.cells),
    );
    // Two pre-launch pilot records are fully complete (§3.1a), so a
    // completeness-based exclusion would fail to remove them and produce
    // 44 + 2 = 46 employees, breaking every percentage against the report.
    expect(completeExcluded.length).toBe(2);
    expect(applyCutoff(rawEmployee.rows).length + completeExcluded.length).toBe(46);
    // The analysed set itself contains records with skipped answers, which
    // is further proof that completeness was never the criterion.
    const incompleteAnalysed = applyCutoff(rawEmployee.rows).filter((r) => !isComplete(r.cells));
    expect(incompleteAnalysed.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* §3.2 step 10 — output assertions                                    */
/* ------------------------------------------------------------------ */

describe('output counts and meta (§3.2, §3.5)', () => {
  it('has exactly 44 employee and 20 employer records', () => {
    expect(employees.length).toBe(44);
    expect(employers.length).toBe(20);
    expect(data.meta.employeeN).toBe(44);
    expect(data.meta.employerN).toBe(20);
  });

  it('no analysed record predates the cut-off', () => {
    for (const sheetName of [SHEET_EMPLOYEE_ANALYSED, SHEET_EMPLOYER_ANALYSED]) {
      for (const row of readSheet(sheetName).rows) {
        expect(row.timestamp).toBeGreaterThanOrEqual(CUTOFF_SERIAL);
      }
    }
  });

  it('meta carries the sample account of §3.5', () => {
    expect(data.meta).toMatchObject({
      reportVersion: '1.0',
      submissionDate: '2026-07-31',
      workPackage: 'WP1',
      grantNumber: '101086110',
      employeeFieldwork: ['2026-03-04', '2026-06-02'],
      employerFieldwork: ['2026-03-04', '2026-07-13'],
      employeeCollected: 48,
      employerCollected: 23,
      employeePilotExcluded: 4,
      employerPilotExcluded: 3,
      employerSelfCompleted: 16,
      employerInterviewed: 7,
    });
  });

  it('emits the full question dictionary: 24 employee + 45 employer questions', () => {
    expect(data.questions.filter((q) => q.dataset === 'employee').length).toBe(24);
    expect(data.questions.filter((q) => q.dataset === 'employer').length).toBe(45);
    for (const def of [...EMPLOYEE_QUESTIONS, ...EMPLOYER_QUESTIONS]) {
      expect(questionById.has(def.id)).toBe(true);
    }
  });

  it('drops Timestamp and the consent column (§3.2 step 2)', () => {
    const ids = new Set(data.questions.map((q) => q.id));
    expect(ids.has('timestamp')).toBe(false);
    expect(ids.has('consent')).toBe(false);
    for (const record of [...employees, ...employers] as unknown as Record<string, unknown>[]) {
      expect('timestamp' in record).toBe(false);
      expect('Timestamp' in record).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Value integrity — no spurious categories, no imputation             */
/* ------------------------------------------------------------------ */

describe('value integrity (§3.2 steps 4–7)', () => {
  const optionValues = (id: string): Set<string> =>
    new Set((questionById.get(id)?.options ?? []).map((o) => o.value));

  it('every single/band value is a dictionary option or null — never raw text', () => {
    for (const q of data.questions) {
      if (q.type !== 'single' && q.type !== 'band') continue;
      const allowed = optionValues(q.id);
      const records = (q.dataset === 'employee' ? employees : employers) as unknown as Record<string, unknown>[];
      for (const r of records) {
        const v = r[q.id];
        if (v !== null) {
          expect(allowed.has(v as string), `${q.id}=${String(v)}`).toBe(true);
        }
      }
    }
  });

  it('every multi-select array contains only dictionary options', () => {
    for (const q of data.questions) {
      if (q.type !== 'multi') continue;
      const allowed = optionValues(q.id);
      const records = (q.dataset === 'employee' ? employees : employers) as unknown as Record<string, unknown>[];
      for (const r of records) {
        for (const v of r[q.id] as string[]) {
          expect(allowed.has(v), `${q.id}=${v}`).toBe(true);
        }
      }
    }
  });

  it('Likert fields are integers 1–5 or null; missing is never imputed (§3.2 step 6)', () => {
    for (const q of data.questions) {
      if (q.type !== 'likert5') continue;
      const records = (q.dataset === 'employee' ? employees : employers) as unknown as Record<string, unknown>[];
      for (const r of records) {
        const v = r[q.id];
        expect(v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5)).toBe(true);
      }
    }
  });

  it('certificate_value keeps its 9 nulls: n = 35, not 44 (§3.3)', () => {
    const nulls = employees.filter((r) => r.certificate_value === null).length;
    expect(nulls).toBe(9);
    expect(questionById.get('certificate_value')!.n).toBe(35);
  });

  it('quarantines unrecognised responses in _other without inventing categories (§3.3)', () => {
    const count = (records: { _other: { question: string }[] }[], q: string) =>
      records.flatMap((r) => r._other).filter((o) => o.question === q).length;

    // Employee Q23: six defined options, everything else in _other.
    expect(count(employees, 'loyalty_factor')).toBe(14);
    const loyaltyOther = employees.flatMap((r) => r._other).filter((o) => o.question === 'loyalty_factor');
    expect(loyaltyOther.map((o) => o.valueTr)).toContain('Soru ve cevaplar uyuşmuyor');
    // Answered = recognised + quarantined; exactly one respondent skipped it.
    const loyaltyRecognised = employees.filter((r) => r.loyalty_factor !== null).length;
    expect(loyaltyRecognised).toBe(29);
    expect(questionById.get('loyalty_factor')!.n).toBe(43);

    // Employee certificates artefacts: "na", an unlisted course, a typed pair.
    expect(count(employees, 'certificates')).toBe(3);
    // Employer quarantines observed in the source data.
    expect(count(employers, 'employment_change_drivers')).toBe(7);
    expect(count(employers, 'retention_methods')).toBe(2);
    expect(count(employers, 'growth_tech_areas')).toBe(1);
    expect(count(employers, 'other_activity_fields')).toBe(1);
  });

  it('handles the "1 ve 3" career-plan answer as a flagged multi-select (§3.3)', () => {
    const flagged = employees.filter((r) => r.flags.includes('career_plan_5y_multiple_selection'));
    expect(flagged.length).toBe(1);
    expect(flagged[0]!.career_plan_5y).toBeNull();
    expect(flagged[0]!.career_plan_5y_multi).toEqual(['managerial', 'current_role']);
    // The free-text geothermal answer is quarantined, not classified.
    const geo = employees.flatMap((r) => r._other).filter((o) => o.question === 'career_plan_5y');
    expect(geo.length).toBe(1);
    expect(geo[0]!.valueTr).toMatch(/Jeotermal/);
  });

  it('keeps "Engineering diploma" as a distinct low-count certificate category (§3.3)', () => {
    const holders = employees.filter((r) => r.certificates.includes('engineering_diploma'));
    expect(holders.length).toBe(1);
  });

  it('never shreds comma-bearing option labels during multi-select splitting', () => {
    // 'Kurulum, Taahhüt, İnşaat, İşletme, Bakım ve Onarım' must arrive as one
    // token; its fragments must never appear in _other.
    const allOther = [...employees, ...employers].flatMap((r) => r._other).map((o) => o.valueTr);
    for (const fragment of ['Kurulum', 'Taahhüt', 'İnşaat', 'Bakım ve Onarım']) {
      expect(allOther).not.toContain(fragment);
    }
    const withInstall = employers.filter((r) => r.other_activity_fields.includes('installation_om'));
    expect(withInstall.length).toBe(10);
  });

  it('employer Q12 (doctorate share) has zero variance: all 20 answered 0–20% (§3.3)', () => {
    expect(employers.every((r) => r.edu_dist_doctorate === '0_20')).toBe(true);
  });

  it('parses employer headcount as integers between 5 and 650 (§3.3)', () => {
    for (const r of employers) {
      expect(Number.isInteger(r.total_employees)).toBe(true);
      expect(r.total_employees!).toBeGreaterThanOrEqual(5);
      expect(r.total_employees!).toBeLessThanOrEqual(650);
    }
  });

  it('keeps annual_volume verbatim, including the "1500 MWp/yık" typo (§3.3)', () => {
    const volumes = employers.map((r) => r.annual_volume);
    expect(volumes).toContain('1500 MWp/yık');
    expect(volumes).toContain('2GW');
    expect(volumes.every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* §3.4 — derived fields                                               */
/* ------------------------------------------------------------------ */

describe('derived fields (§3.4)', () => {
  it('has_certificate is false only for empty or "No certificate"-only arrays', () => {
    for (const r of employees) {
      const expected = r.certificates.length > 0 && !r.certificates.every((c) => c === 'none');
      expect(r.has_certificate).toBe(expected);
    }
    expect(employees.filter((r) => !r.has_certificate).length).toBe(16);
    // The certificate-type bar's "No certificate" count stays 14 (32%).
    expect(employees.filter((r) => r.certificates.includes('none')).length).toBe(14);
  });

  it('education_match_band collapses Likert Q8 to 8 misaligned / 13 neutral / 23 aligned', () => {
    const tally = { misaligned: 0, neutral: 0, aligned: 0 };
    for (const r of employees) {
      expect(r.education_match_band).not.toBeNull();
      tally[r.education_match_band!]++;
    }
    expect(tally).toEqual({ misaligned: 8, neutral: 13, aligned: 23 });
  });

  it('seniority collapses experience to 8 early / 26 mid / 10 senior', () => {
    const tally = { early: 0, mid: 0, senior: 0 };
    for (const r of employees) tally[r.seniority!]++;
    expect(tally).toEqual({ early: 8, mid: 26, senior: 10 });
  });

  it('firm_scale collapses company size to 12 micro / 10 small_mid / 7 large / 15 corporate', () => {
    const tally = { micro: 0, small_mid: 0, large: 0, corporate: 0 };
    for (const r of employees) tally[r.firm_scale!]++;
    expect(tally).toEqual({ micro: 12, small_mid: 10, large: 7, corporate: 15 });
  });

  it('employee_count_band matches the employee-side firm scale bands', () => {
    const tally = { micro: 0, small_mid: 0, large: 0, corporate: 0 };
    for (const r of employers) {
      const c = r.total_employees!;
      const expected = c <= 9 ? 'micro' : c <= 149 ? 'small_mid' : c <= 499 ? 'large' : 'corporate';
      expect(r.employee_count_band).toBe(expected);
      tally[r.employee_count_band!]++;
    }
    expect(tally).toEqual({ micro: 5, small_mid: 10, large: 4, corporate: 1 });
  });

  it('turnover_mean_band is the modal band across the 8 staff groups', () => {
    const order = ['0_10', '11_20', '21_30', '31_40', '41_plus'];
    for (const r of employers) {
      const counts = new Map<string, number>();
      for (const id of [
        'turnover_manager', 'turnover_project_specialist', 'turnover_rd_engineer',
        'turnover_project_technical', 'turnover_entry_engineer', 'turnover_technician',
        'turnover_field_worker', 'turnover_admin',
      ] as const) {
        const v = r[id];
        if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const max = Math.max(...counts.values());
      const expected = order.find((b) => (counts.get(b) ?? 0) === max);
      expect(r.turnover_mean_band).toBe(expected);
    }
  });

  it('is_manufacturer covers main or other cell/panel and component manufacturing', () => {
    for (const r of employers) {
      const m = new Set(['cell_panel_manufacturing', 'component_manufacturing']);
      const expected =
        (r.main_activity_field !== null && m.has(r.main_activity_field)) ||
        r.other_activity_fields.some((v) => m.has(v));
      expect(r.is_manufacturer).toBe(expected);
    }
    expect(employers.filter((r) => r.is_manufacturer).length).toBe(10);
  });
});

/* ------------------------------------------------------------------ */
/* Reconciliation with the published report                            */
/* ------------------------------------------------------------------ */

describe('reconciliation with published report figures', () => {
  it('wage comparison: 45.5% lower / 40.9% similar / 2.3% higher (§6.5)', () => {
    const pct = (v: string) =>
      (employees.filter((r) => r.wage_comparison === v).length / 44) * 100;
    expect(pct('lower')).toBeCloseTo(45.5, 1);
    expect(pct('similar')).toBeCloseTo(40.9, 1);
    expect(pct('higher')).toBeCloseTo(2.3, 1);
  });

  it('confidence ladder counts: self 34, employer 28, sector 23 of 44 (§6.3)', () => {
    const agree = (id: keyof EmployeeRecord) =>
      employees.filter((r) => (r[id] as number | null) !== null && (r[id] as number) >= 4).length;
    expect(agree('confidence_self')).toBe(34); // 77.3% ≈ report's 78%
    expect(agree('confidence_employer')).toBe(28); // 63.6% ≈ 64%
    expect(agree('confidence_sector')).toBe(23); // 52.3% ≈ 53%
  });

  it('84% clean-energy satisfaction and 65% graduate-readiness disagreement (§6.1)', () => {
    const cleanAgree = employees.filter((r) => (r.clean_energy_satisfaction ?? 0) >= 4).length;
    expect(cleanAgree / 44).toBeCloseTo(0.841, 2);
    const gradDisagree = employers.filter(
      (r) => r.graduate_readiness !== null && r.graduate_readiness <= 2,
    ).length;
    expect(gradDisagree / 20).toBeCloseTo(0.65, 2);
  });

  it('the "47% unrelated roles" figure decomposes into 29.5% neutral + 18.2% disagreeing (§6.6)', () => {
    const neutral = employees.filter((r) => r.education_match_band === 'neutral').length;
    const misaligned = employees.filter((r) => r.education_match_band === 'misaligned').length;
    expect(neutral / 44).toBeCloseTo(0.295, 2);
    expect(misaligned / 44).toBeCloseTo(0.182, 2);
    expect((neutral + misaligned) / 44).toBeCloseTo(0.477, 2);
  });

  it('2-year employment change: 45% expect 0–25% growth, 25% expect more (§6.10 correction)', () => {
    const count = (v: string) => employers.filter((r) => r.employment_change_2y === v).length;
    expect(count('increase_0_25')).toBe(9); // 45%
    expect(count('increase_over_25')).toBe(5); // 25%
    expect(count('stable')).toBe(2);
    expect(count('decrease_0_25')).toBe(3);
    expect(count('decrease_over_25')).toBe(1);
  });

  it('investment speed drives 95% of employment-change expectations (§6.10)', () => {
    const n = employers.filter((r) =>
      r.employment_change_drivers.includes('investment_speed'),
    ).length;
    expect(n).toBe(19);
  });
});

/* ------------------------------------------------------------------ */
/* §4 — labels are the dictionary's, verbatim                          */
/* ------------------------------------------------------------------ */

describe('English labels match BuildSpec §4 verbatim', () => {
  it('spot-checks question labels', () => {
    expect(questionById.get('confidence_sector')!.labelEn).toBe(
      'The Turkish solar sector will grow steadily and is a secure long-term career',
    );
    expect(questionById.get('graduate_readiness')!.labelEn).toBe(
      "New graduates' job readiness and curriculum adequacy meet expectations",
    );
    expect(questionById.get('loyalty_factor')!.labelEn).toBe(
      'Most decisive factor for a long-term career in solar',
    );
  });

  it('loyalty_factor exposes exactly the six §4 options', () => {
    const labels = questionById.get('loyalty_factor')!.options!.map((o) => o.labelEn);
    expect(labels).toEqual([
      'Pay and benefits lagging other sectors',
      'Limited professional development opportunities',
      'Diversity of fringe benefits',
      'Concern about keeping pace with technological change',
      'Uncertainty from the subcontracting system',
      'No confidence in sector sustainability due to policy',
    ]);
  });

  it('Likert scale labels run Strongly disagree → Strongly agree', () => {
    const opts = questionById.get('pay_fairness')!.options!;
    expect(opts.map((o) => o.labelEn)).toEqual([
      'Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree',
    ]);
  });

  it('every question keeps its Turkish label for the TR locale', () => {
    for (const q of data.questions) {
      expect(q.labelTr.length).toBeGreaterThan(0);
      expect(q.shortLabel.length).toBeLessThanOrEqual(40);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Idempotency (§3.2)                                                  */
/* ------------------------------------------------------------------ */

describe('re-runnability', () => {
  it('re-running the ETL reproduces the committed JSON byte-for-byte', () => {
    const jsonPath = fileURLToPath(new URL('../src/data/survey-data.json', import.meta.url));
    const before = readFileSync(jsonPath, 'utf8');
    execSync('npx tsx scripts/build-data.ts', {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdio: 'pipe',
    });
    const after = readFileSync(jsonPath, 'utf8');
    expect(after).toBe(before);
  });
});
